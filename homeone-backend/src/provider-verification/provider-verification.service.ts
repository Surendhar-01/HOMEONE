import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { SupabaseServiceClient } from '../database/supabase.module';
import { SUPABASE_SERVICE } from '../database/supabase.module';
import type {
  ProviderVerificationHistoryRow,
  ServiceProviderRow,
  VerificationStatus,
} from '../database/database.types';
import { assertNoError } from '../database/supabase-error.util';
import { VERIFICATION_MESSAGES } from '../common/constants/verification-messages';

export interface VerificationActionResult {
  providerId: string;
  oldStatus: VerificationStatus;
  newStatus: VerificationStatus;
  reason: string | null;
  reviewedAt: string;
  title: string;
  message: string;
}

/**
 * The single place verification status is mutated. Providers never call this
 * directly - only `AdminController`, always with the acting admin's user id, so
 * every change lands in `provider_verification_history` and produces a
 * notification for the professional.
 */
@Injectable()
export class ProviderVerificationService {
  private readonly logger = new Logger(ProviderVerificationService.name);

  constructor(@Inject(SUPABASE_SERVICE) private readonly client: SupabaseServiceClient) {}

  async listPending(
    limit = 50,
    offset = 0,
  ): Promise<{
    items: (ServiceProviderRow & { domainName: string | null; fullName: string | null })[];
    total: number;
    limit: number;
    offset: number;
  }> {
    const { count, error: countError } = await this.client
      .from('service_providers')
      .select('id', { count: 'exact', head: true })
      .eq('verification_status', 'PENDING');
    assertNoError(countError);

    const { data, error } = await this.client
      .from('service_providers')
      .select('*')
      .eq('verification_status', 'PENDING')
      .order('submitted_at', { ascending: true })
      .range(offset, offset + limit - 1);
    assertNoError(error);

    const { items } = await this.attachNames((data ?? []) as ServiceProviderRow[]);

    return { items, total: count ?? items.length, limit, offset };
  }

  /** Adds `domainName` and `fullName` to provider rows for the admin list. */
  async attachNames<T extends ServiceProviderRow>(
    rows: T[],
  ): Promise<{ items: (T & { domainName: string | null; fullName: string | null })[] }> {
    const domainIds = [...new Set(rows.map((row) => row.domain_id))];
    const userIds = [...new Set(rows.map((row) => row.user_id))];

    const [{ data: domains }, { data: profiles }] = await Promise.all([
      domainIds.length
        ? this.client.from('service_domains').select('id, domain_name').in('id', domainIds)
        : Promise.resolve({ data: [] as { id: string; domain_name: string }[] }),
      userIds.length
        ? this.client.from('profiles').select('id, full_name').in('id', userIds)
        : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    ]);

    const domainById = new Map(
      ((domains ?? []) as { id: string; domain_name: string }[]).map((row) => [
        row.id,
        row.domain_name,
      ]),
    );
    const nameById = new Map(
      ((profiles ?? []) as { id: string; full_name: string }[]).map((row) => [
        row.id,
        row.full_name,
      ]),
    );

    return {
      items: rows.map((row) => ({
        ...row,
        domainName: domainById.get(row.domain_id) ?? null,
        fullName: nameById.get(row.user_id) ?? null,
      })),
    };
  }

  async history(providerId: string): Promise<ProviderVerificationHistoryRow[]> {
    const { data, error } = await this.client
      .from('provider_verification_history')
      .select('*')
      .eq('provider_id', providerId)
      .order('reviewed_at', { ascending: false });
    assertNoError(error);
    return (data ?? []) as ProviderVerificationHistoryRow[];
  }

  approve(providerId: string, adminId: string): Promise<VerificationActionResult> {
    return this.transition(providerId, adminId, 'APPROVED', null);
  }

  reject(
    providerId: string,
    adminId: string,
    reason: string,
  ): Promise<VerificationActionResult> {
    return this.transition(providerId, adminId, 'REJECTED', reason);
  }

  block(providerId: string, adminId: string, reason: string): Promise<VerificationActionResult> {
    return this.transition(providerId, adminId, 'BLOCKED', reason);
  }

  /** Allows a rejected provider to be sent back for review. */
  async resubmit(providerId: string): Promise<void> {
    const { error } = await this.client
      .from('service_providers')
      .update({
        verification_status: 'PENDING',
        verification_reason: null,
        verified_at: null,
        submitted_at: new Date().toISOString(),
      })
      .eq('id', providerId);
    assertNoError(error);
  }

  private async transition(
    providerId: string,
    adminId: string,
    newStatus: VerificationStatus,
    reason: string | null,
  ): Promise<VerificationActionResult> {
    const provider = await this.requireProvider(providerId);

    if (newStatus !== 'APPROVED' && !reason?.trim()) {
      throw new BadRequestException(`A reason is required when marking a provider ${newStatus}.`);
    }

    const oldStatus = provider.verification_status;
    if (oldStatus === newStatus) {
      throw new BadRequestException(`This provider is already ${newStatus}.`);
    }

    if (newStatus === 'APPROVED' && oldStatus === 'BLOCKED') {
      throw new ForbiddenException('A blocked provider cannot be approved directly. Unblock first.');
    }

    const reviewedAt = new Date().toISOString();

    const { error: updateError } = await this.client
      .from('service_providers')
      .update({
        verification_status: newStatus,
        verification_reason: reason ?? null,
        verified_at: reviewedAt,
      })
      .eq('id', providerId);
    assertNoError(updateError);

    const { error: historyError } = await this.client
      .from('provider_verification_history')
      .insert({
        provider_id: providerId,
        old_status: oldStatus,
        new_status: newStatus,
        reason: reason ?? null,
        reviewed_by: adminId,
        reviewed_at: reviewedAt,
      });
    assertNoError(historyError);

    const copy = VERIFICATION_MESSAGES[newStatus];
    const message = reason?.trim() ? `${copy.message}\n\nReason: ${reason.trim()}` : copy.message;

    const { error: notificationError } = await this.client.from('notifications').insert({
      user_id: provider.user_id,
      title: copy.title,
      message,
      notification_type: 'VERIFICATION_STATUS',
    });

    if (notificationError) {
      this.logger.error(
        `Notification insert failed for provider ${providerId}: ${notificationError.message}`,
      );
    }

    return {
      providerId,
      oldStatus,
      newStatus,
      reason: reason ?? null,
      reviewedAt,
      title: copy.title,
      message: copy.message,
    };
  }

  private async requireProvider(providerId: string): Promise<ServiceProviderRow> {
    const { data, error } = await this.client
      .from('service_providers')
      .select('*')
      .eq('id', providerId)
      .maybeSingle();
    assertNoError(error);

    if (!data) {
      throw new NotFoundException('Service provider not found.');
    }
    return data as ServiceProviderRow;
  }
}