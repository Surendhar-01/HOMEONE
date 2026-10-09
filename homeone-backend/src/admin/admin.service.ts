import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { SupabaseServiceClient } from '../database/supabase.module';
import { SUPABASE_SERVICE } from '../database/supabase.module';
import type {
  ProviderVerificationHistoryRow,
  ProviderWorkingHourRow,
  ServiceProviderRow,
} from '../database/database.types';
import { assertNoError } from '../database/supabase-error.util';
import { ProviderDocumentsService } from '../provider-documents/provider-documents.service';
import { ProviderVerificationService } from '../provider-verification/provider-verification.service';
import type {
  AdminDocumentDto,
  AdminProviderDetailDto,
  PendingProviderDto,
  ReviewActionDto,
  VerificationActionResponseDto,
  VerificationHistoryDto,
} from './dto/admin.dto';

@Injectable()
export class AdminService {
  constructor(
    @Inject(SUPABASE_SERVICE) private readonly client: SupabaseServiceClient,
    private readonly verification: ProviderVerificationService,
    private readonly documents: ProviderDocumentsService,
  ) {}

  async listPendingProviders(limit: number, offset: number) {
    const result = await this.verification.listPending(limit, offset);
    const userIds = result.items.map((row) => row.user_id);

    const { data: profiles } = userIds.length
      ? await this.client.from('profiles').select('id, mobile_number, email').in('id', userIds)
      : { data: [] as { id: string; mobile_number: string | null; email: string }[] };

    const contactById = new Map(
      ((profiles ?? []) as { id: string; mobile_number: string | null; email: string }[]).map(
        (row) => [row.id, row],
      ),
    );

    const items: PendingProviderDto[] = result.items.map((row) => {
      const contact = contactById.get(row.user_id);
      return {
        id: row.id,
        fullName: row.fullName,
        mobileNumber: contact?.mobile_number ?? null,
        email: contact?.email ?? null,
        domainName: row.domainName,
        yearsOfExperience: row.years_of_experience,
        languagesSpoken: row.languages_spoken ?? [],
        submittedAt: row.submitted_at,
        verificationStatus: row.verification_status,
      };
    });

    return { items, total: result.total, limit: result.limit, offset: result.offset };
  }

  async getProviderDetail(providerId: string): Promise<AdminProviderDetailDto> {
    const provider = await this.requireProvider(providerId);

    const [{ data: profile }, { data: domain }, { data: skillRows }, { data: hours }] =
      await Promise.all([
        this.client
          .from('profiles')
          .select('full_name, mobile_number, email')
          .eq('id', provider.user_id)
          .maybeSingle(),
        this.client
          .from('service_domains')
          .select('domain_name')
          .eq('id', provider.domain_id)
          .maybeSingle(),
        this.client.from('provider_skills').select('service_id').eq('provider_id', providerId),
        this.client
          .from('provider_working_hours')
          .select('day_of_week, start_time, end_time')
          .eq('provider_id', providerId)
          .order('day_of_week'),
      ]);

    const serviceIds = ((skillRows ?? []) as { service_id: string }[]).map((r) => r.service_id);
    const { data: serviceRows } = serviceIds.length
      ? await this.client.from('services').select('id, service_name').in('id', serviceIds)
      : { data: [] as { id: string; service_name: string }[] };

    const history = await this.verification.history(providerId);
    const contact = profile as {
      full_name: string;
      mobile_number: string | null;
      email: string;
    } | null;

    return {
      id: provider.id,
      userId: provider.user_id,
      fullName: contact?.full_name ?? null,
      mobileNumber: contact?.mobile_number ?? null,
      email: contact?.email ?? null,
      domainName: (domain as { domain_name: string } | null)?.domain_name ?? null,
      skills: ((serviceRows ?? []) as { service_name: string }[]).map((r) => r.service_name),
      yearsOfExperience: provider.years_of_experience,
      languagesSpoken: provider.languages_spoken ?? [],
      businessAddress: provider.business_address,
      latitude: provider.latitude,
      longitude: provider.longitude,
      workingHours: (
        (hours ?? []) as Pick<ProviderWorkingHourRow, 'day_of_week' | 'start_time' | 'end_time'>[]
      ).map((row) => ({
        dayOfWeek: row.day_of_week,
        startTime: row.start_time,
        endTime: row.end_time,
      })),
      verificationStatus: provider.verification_status,
      verificationReason: provider.verification_reason,
      verifiedAt: provider.verified_at,
      submittedAt: provider.submitted_at,
      verificationHistory: history.map(toHistoryDto),
    };
  }

  async getProviderDocuments(providerId: string, adminUserId: string): Promise<AdminDocumentDto[]> {
    const rows = await this.documents.listForReviewer(providerId, adminUserId, true);

    return rows.map((row) => ({
      id: row.id,
      documentType: row.document_type,
      originalFilename: row.original_filename,
      mimeType: row.mime_type,
      sizeBytes: row.size_bytes === null ? null : Number(row.size_bytes),
      uploadedAt: row.uploaded_at,
      signedUrl: row.signedUrl,
    }));
  }

  async approve(providerId: string, adminUserId: string): Promise<VerificationActionResponseDto> {
    return toActionDto(await this.verification.approve(providerId, adminUserId));
  }

  async reject(
    providerId: string,
    adminUserId: string,
    dto: ReviewActionDto,
  ): Promise<VerificationActionResponseDto> {
    return toActionDto(await this.verification.reject(providerId, adminUserId, dto.reason));
  }

  async block(
    providerId: string,
    adminUserId: string,
    dto: ReviewActionDto,
  ): Promise<VerificationActionResponseDto> {
    return toActionDto(await this.verification.block(providerId, adminUserId, dto.reason));
  }

  async getHistory(providerId: string): Promise<VerificationHistoryDto[]> {
    await this.requireProvider(providerId);
    const rows = await this.verification.history(providerId);
    return rows.map(toHistoryDto);
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

function toHistoryDto(row: ProviderVerificationHistoryRow): VerificationHistoryDto {
  return {
    id: row.id,
    oldStatus: row.old_status,
    newStatus: row.new_status,
    reason: row.reason,
    reviewedBy: row.reviewed_by,
    reviewedAt: row.reviewed_at,
  };
}

function toActionDto(result: {
  providerId: string;
  oldStatus: string;
  newStatus: string;
  reason: string | null;
  reviewedAt: string;
  title: string;
  message: string;
}): VerificationActionResponseDto {
  return {
    providerId: result.providerId,
    oldStatus: result.oldStatus,
    newStatus: result.newStatus,
    reason: result.reason,
    reviewedAt: result.reviewedAt,
    title: result.title,
    message: result.message,
  };
}
