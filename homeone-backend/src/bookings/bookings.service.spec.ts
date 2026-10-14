import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { BookingsService, TRANSITIONS } from './bookings.service';
import type { BookingRow, BookingStatus } from '../database/database.types';

const CUSTOMER_ID = '11111111-1111-4111-8111-111111111111';
const PROVIDER_USER_ID = '22222222-2222-4222-8222-222222222222';
const PROVIDER_ID = 'p-1';

const booking = (overrides: Partial<BookingRow> = {}): BookingRow =>
  ({
    id: 'b-1',
    customer_id: CUSTOMER_ID,
    provider_id: PROVIDER_ID,
    service_id: 's-1',
    home_id: null,
    address_snapshot: '12 MG Road, Bengaluru',
    latitude: 12.97,
    longitude: 77.59,
    scheduled_at: new Date(Date.now() + 86400000).toISOString(),
    problem_description: 'The kitchen tap leaks continuously.',
    urgency: 'NORMAL',
    status: 'REQUESTED',
    status_updated_at: new Date().toISOString(),
    idempotency_key: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }) as BookingRow;

/** Minimal PostgREST stand-in supporting the chains BookingsService uses. */
class FakeTable {
  readonly inserts: Record<string, unknown>[] = [];
  private rows: Record<string, unknown>[];
  private current: Record<string, unknown>[] = [];

  constructor(rows: Record<string, unknown>[]) {
    this.rows = rows;
  }

  select() {
    this.current = [...this.rows];
    return this;
  }

  eq(column: string, value: unknown) {
    this.current = this.current.filter((row) => row[column] === value);
    return this;
  }

  order() {
    return this;
  }

  range() {
    return Promise.resolve({ data: this.current, error: null, count: this.current.length });
  }

  maybeSingle() {
    const row = this.current[0] ?? null;
    return Promise.resolve({ data: row ? { ...row } : null, error: null });
  }

  single() {
    const row = this.current[0] ?? null;
    return Promise.resolve({ data: row ? { ...row } : null, error: null });
  }

  insert(row: Record<string, unknown>) {
    this.inserts.push(row);
    this.rows.push(row);
    return Promise.resolve({ data: [row], error: null });
  }

  update(patch: Record<string, unknown>) {
    const table = this;
    return {
      eq(column: string, value: unknown) {
        for (const row of table.rows.filter((r) => r[column] === value)) {
          Object.assign(row, patch);
        }
        return Promise.resolve({ data: [], error: null });
      },
    };
  }
}

function buildService(current: BookingRow | null) {
  const tables: Record<string, FakeTable> = {
    bookings: new FakeTable(current ? [{ ...current }] : []),
    booking_status_history: new FakeTable([]),
    booking_photos: new FakeTable([]),
    service_providers: new FakeTable([{ id: PROVIDER_ID, user_id: PROVIDER_USER_ID }]),
    services: new FakeTable([{ id: 's-1', service_name: 'Deep Cleaning' }]),
    profiles: new FakeTable([{ id: PROVIDER_USER_ID, full_name: 'Provider Pro' }]),
  };
  const notifications: { userId: string; title: string }[] = [];
  const service = new BookingsService(
    { from: (table: string) => tables[table] } as never,
    { createSignedUrl: async () => 'https://example.com/signed' } as never,
    {
      createForUser: async (userId: string, title: string) => {
        notifications.push({ userId, title });
      },
    } as never,
  );
  return { service, notifications, tables };
}

describe('booking state machine', () => {
  describe('TRANSITIONS table', () => {
    it('accepts the full happy path', () => {
      const path: BookingStatus[] = [
        'REQUESTED',
        'ACCEPTED',
        'ON_THE_WAY',
        'ARRIVED',
        'IN_PROGRESS',
        'COMPLETED',
      ];
      for (let i = 0; i < path.length - 1; i += 1) {
        const rules = TRANSITIONS[path[i]];
        expect(rules.map((r) => r.to)).toContain(path[i + 1]);
      }
    });

    it('never leaves terminal states', () => {
      for (const terminal of ['REJECTED', 'CANCELLED', 'COMPLETED'] as BookingStatus[]) {
        expect(TRANSITIONS[terminal]).toHaveLength(0);
      }
    });

    it('requires a reason only for rejection', () => {
      const requested = TRANSITIONS.REQUESTED;
      expect(requested.find((r) => r.to === 'REJECTED')?.needsReason).toBe(true);
      expect(requested.find((r) => r.to === 'ACCEPTED')?.needsReason).toBe(false);
      expect(requested.find((r) => r.to === 'CANCELLED')?.needsReason).toBe(false);
    });

    it('lets only professionals advance the job', () => {
      for (const next of ['ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS', 'COMPLETED'] as BookingStatus[]) {
        const from = (Object.keys(TRANSITIONS) as BookingStatus[]).find((status) =>
          TRANSITIONS[status].some((r) => r.to === next),
        ) as BookingStatus;
        const rule = TRANSITIONS[from].find((r) => r.to === next);
        expect(rule?.by).toEqual(['PROFESSIONAL']);
      }
    });

    it('lets only customers cancel', () => {
      for (const from of ['REQUESTED', 'ACCEPTED', 'ON_THE_WAY', 'ARRIVED'] as BookingStatus[]) {
        const rule = TRANSITIONS[from].find((r) => r.to === 'CANCELLED');
        expect(rule?.by).toEqual(['CUSTOMER']);
      }
    });
  });

  describe('BookingsService.updateStatus', () => {
    const customer = {
      id: CUSTOMER_ID,
      email: 'c@example.com',
      phone: null,
      role: 'CUSTOMER' as const,
      roles: ['CUSTOMER' as const],
      fullName: 'Customer',
      isEmailVerified: true,
      isMobileVerified: false,
    };

    const professional = {
      id: PROVIDER_USER_ID,
      email: 'p@example.com',
      phone: null,
      role: 'PROFESSIONAL' as const,
      roles: ['PROFESSIONAL' as const],
      fullName: 'Provider',
      isEmailVerified: true,
      isMobileVerified: false,
    };

    it('rejects an illegal transition', async () => {
      const { service } = buildService(booking({ status: 'REQUESTED' }));
      await expect(service.updateStatus('b-1', customer, { status: 'COMPLETED' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('rejects a transition by the wrong side', async () => {
      const { service } = buildService(booking({ status: 'REQUESTED' }));
      await expect(service.updateStatus('b-1', customer, { status: 'ACCEPTED' })).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('requires a reason for rejection', async () => {
      const { service } = buildService(booking({ status: 'REQUESTED' }));
      await expect(
        service.updateStatus('b-1', professional, { status: 'REJECTED' }),
      ).rejects.toThrow(BadRequestException);
    });

    it('refuses to touch a terminal booking', async () => {
      const { service } = buildService(booking({ status: 'COMPLETED' }));
      await expect(service.updateStatus('b-1', customer, { status: 'CANCELLED' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('throws 404 for an unknown booking', async () => {
      const { service } = buildService(null);
      await expect(
        service.updateStatus('missing', customer, { status: 'CANCELLED' }),
      ).rejects.toThrow();
    });

    it('lets the customer cancel and notifies the provider', async () => {
      const { service, notifications, tables } = buildService(booking({ status: 'REQUESTED' }));
      const result = await service.updateStatus('b-1', customer, { status: 'CANCELLED' });

      expect(result.status).toBe('CANCELLED');
      expect(notifications).toHaveLength(1);
      expect(notifications[0].userId).toBe(PROVIDER_USER_ID);
      expect(notifications[0].title).toBe('Booking cancelled');
      expect(tables.booking_status_history.inserts).toHaveLength(1);
      expect(tables.booking_status_history.inserts[0]).toMatchObject({
        booking_id: 'b-1',
        old_status: 'REQUESTED',
        new_status: 'CANCELLED',
        changed_by: CUSTOMER_ID,
      });
    });

    it('lets the provider accept and notifies the customer', async () => {
      const { service, notifications } = buildService(booking({ status: 'REQUESTED' }));
      const result = await service.updateStatus('b-1', professional, { status: 'ACCEPTED' });

      expect(result.status).toBe('ACCEPTED');
      expect(notifications).toHaveLength(1);
      expect(notifications[0].userId).toBe(CUSTOMER_ID);
      expect(notifications[0].title).toBe('Booking accepted');
    });

    it('lets the provider reject with a reason', async () => {
      const { service, notifications } = buildService(booking({ status: 'REQUESTED' }));
      const result = await service.updateStatus('b-1', professional, {
        status: 'REJECTED',
        reason: 'Fully booked that day',
      });

      expect(result.status).toBe('REJECTED');
      expect(notifications).toHaveLength(1);
      expect(notifications[0].userId).toBe(CUSTOMER_ID);
    });
  });
});
