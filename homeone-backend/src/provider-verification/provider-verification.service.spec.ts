import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ProviderVerificationService } from '../provider-verification/provider-verification.service';
import { VERIFICATION_MESSAGES } from '../common/constants/verification-messages';
import type { ServiceProviderRow } from '../database/database.types';

const ADMIN_ID = '33333333-3333-4333-8333-333333333333';

const provider = (overrides: Partial<ServiceProviderRow> = {}): ServiceProviderRow =>
  ({
    id: 'p-1',
    user_id: 'u-1',
    domain_id: 'd-1',
    years_of_experience: 5,
    languages_spoken: ['Tamil'],
    business_address: '12 MG Road, Bengaluru',
    latitude: 12.97,
    longitude: 77.59,
    has_certificate: true,
    verification_status: 'PENDING',
    verification_reason: null,
    verified_at: null,
    submitted_at: '2026-01-01T00:00:00.000Z',
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }) as ServiceProviderRow;

/**
 * Minimal in-memory stand-in for the PostgREST query builder. Only the chain
 * segments these tests exercise are implemented.
 */
class FakeTable {
  readonly updates: Record<string, unknown>[] = [];
  readonly inserts: Record<string, unknown>[] = [];

  constructor(
    private readonly rows: Record<string, unknown>[],
    private readonly tableName: string,
  ) {}

  select() {
    return this;
  }

  eq(column: string, value: unknown) {
    this.current = this.rows.filter((row) => row[column] === value);
    return this;
  }

  private current: Record<string, unknown>[] = [];

  maybeSingle() {
    const row = this.current[0] ?? null;
    return Promise.resolve({ data: row, error: null });
  }

  single() {
    return Promise.resolve({ data: this.current[0] ?? null, error: null });
  }

  order() {
    return Promise.resolve({ data: this.current, error: null });
  }

  range() {
    return Promise.resolve({ data: this.current, error: null });
  }

  in(column: string, values: unknown[]) {
    this.current = this.rows.filter((row) => values.includes(row[column]));
    return this;
  }

  update(patch: Record<string, unknown>) {
    this.pendingPatch = patch;
    return this;
  }

  insert(row: Record<string, unknown> | Record<string, unknown>[]) {
    const rows = Array.isArray(row) ? row : [row];
    this.inserts.push(...rows);
    this.rows.push(...rows);
    return Promise.resolve({ data: rows, error: null });
  }

  delete() {
    return Promise.resolve({ data: [], error: null });
  }

  pendingPatch: Record<string, unknown> = {};
}

describe('ProviderVerificationService', () => {
  const buildService = (row: ServiceProviderRow) => {
    const providers = new FakeTable([{ ...row }], 'service_providers');
    const history = new FakeTable([], 'provider_verification_history');
    const notifications = new FakeTable([], 'notifications');

    const client = {
      from: (table: string) => {
        if (table === 'service_providers') return providers;
        if (table === 'provider_verification_history') return history;
        if (table === 'notifications') return notifications;
        throw new Error(`Unexpected table ${table}`);
      },
    };

    return {
      service: new ProviderVerificationService(client as never),
      providers,
      history,
      notifications,
    };
  };

  it('approves a pending provider and records the audit trail', async () => {
    const { service, history, notifications } = buildService(provider());

    const result = await service.approve('p-1', ADMIN_ID);

    expect(result.newStatus).toBe('APPROVED');
    expect(result.oldStatus).toBe('PENDING');
    expect(result.message).toBe(VERIFICATION_MESSAGES.APPROVED.message);

    expect(history.inserts).toHaveLength(1);
    expect(history.inserts[0]).toMatchObject({
      provider_id: 'p-1',
      old_status: 'PENDING',
      new_status: 'APPROVED',
      reviewed_by: ADMIN_ID,
    });

    expect(notifications.inserts).toHaveLength(1);
    expect(notifications.inserts[0]).toMatchObject({
      user_id: 'u-1',
      notification_type: 'VERIFICATION_STATUS',
      title: VERIFICATION_MESSAGES.APPROVED.title,
    });
  });

  it('rejects with the stored reason and includes it in the notification', async () => {
    const { service, history } = buildService(provider());

    const result = await service.reject('p-1', ADMIN_ID, 'Blurry ID scan');

    expect(result.newStatus).toBe('REJECTED');
    expect(result.reason).toBe('Blurry ID scan');
    expect(history.inserts[0]).toMatchObject({ reason: 'Blurry ID scan' });
  });

  it('blocks with a reason', async () => {
    const { service } = buildService(provider({ verification_status: 'APPROVED' }));

    const result = await service.block('p-1', ADMIN_ID, 'Repeated no-shows');

    expect(result.newStatus).toBe('BLOCKED');
    expect(result.oldStatus).toBe('APPROVED');
  });

  it('refuses to reject without a reason', async () => {
    const { service } = buildService(provider());

    await expect(service.reject('p-1', ADMIN_ID, '   ')).rejects.toThrow(BadRequestException);
  });

  it('refuses a no-op transition', async () => {
    const { service } = buildService(provider({ verification_status: 'APPROVED' }));

    await expect(service.approve('p-1', ADMIN_ID)).rejects.toThrow(BadRequestException);
  });

  it('refuses to approve a blocked provider directly', async () => {
    const { service } = buildService(provider({ verification_status: 'BLOCKED' }));

    await expect(service.approve('p-1', ADMIN_ID)).rejects.toThrow(ForbiddenException);
  });

  it('throws when the provider does not exist', async () => {
    const { service } = buildService(provider());

    await expect(service.approve('missing', ADMIN_ID)).rejects.toThrow(NotFoundException);
  });

  it('appends the reason to the rejection notification message', async () => {
    const { service, notifications } = buildService(provider());

    await service.reject('p-1', ADMIN_ID, 'Invalid experience proof');

    expect(notifications.inserts[0].message).toContain('Invalid experience proof');
  });
});
