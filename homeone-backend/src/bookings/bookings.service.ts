import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { SupabaseServiceClient } from '../database/supabase.module';
import { SUPABASE_SERVICE } from '../database/supabase.module';
import type {
  AuthenticatedUser,
  BookingRow,
  BookingStatus,
  BookingStatusHistoryRow,
} from '../database/database.types';
import { assertNoError } from '../database/supabase-error.util';
import { StorageService, BUCKETS } from '../storage/storage.service';
import { NotificationsService } from '../notifications/notifications.service';
import type {
  BookingResponseDto,
  CreateBookingDto,
  ListBookingsQueryDto,
  UpdateBookingStatusDto,
} from './dto/booking.dto';

interface TransitionRule {
  to: BookingStatus;
  by: ('CUSTOMER' | 'PROFESSIONAL')[];
  needsReason: boolean;
  notify: 'customer' | 'provider';
  title: string;
  message: (booking: BookingRow) => string;
}

/**
 * The booking state machine. Every transition is validated here, recorded in
 * `booking_status_history`, and notified to the other party. No other code
 * path may change `bookings.status`.
 */
const TRANSITIONS: Record<BookingStatus, TransitionRule[]> = {
  REQUESTED: [
    {
      to: 'ACCEPTED',
      by: ['PROFESSIONAL'],
      needsReason: false,
      notify: 'customer',
      title: 'Booking accepted',
      message: () => 'Your booking request has been accepted by the professional.',
    },
    {
      to: 'REJECTED',
      by: ['PROFESSIONAL'],
      needsReason: true,
      notify: 'customer',
      title: 'Booking rejected',
      message: () => 'Your booking request was declined by the professional.',
    },
    {
      to: 'CANCELLED',
      by: ['CUSTOMER'],
      needsReason: false,
      notify: 'provider',
      title: 'Booking cancelled',
      message: () => 'The customer cancelled the booking request.',
    },
  ],
  ACCEPTED: [
    {
      to: 'ON_THE_WAY',
      by: ['PROFESSIONAL'],
      needsReason: false,
      notify: 'customer',
      title: 'Professional on the way',
      message: () => 'Your service professional is on the way.',
    },
    {
      to: 'CANCELLED',
      by: ['CUSTOMER'],
      needsReason: false,
      notify: 'provider',
      title: 'Booking cancelled',
      message: () => 'The customer cancelled the accepted booking.',
    },
  ],
  ON_THE_WAY: [
    {
      to: 'ARRIVED',
      by: ['PROFESSIONAL'],
      needsReason: false,
      notify: 'customer',
      title: 'Professional arrived',
      message: () => 'Your service professional has arrived.',
    },
    {
      to: 'CANCELLED',
      by: ['CUSTOMER'],
      needsReason: false,
      notify: 'provider',
      title: 'Booking cancelled',
      message: () => 'The customer cancelled the booking.',
    },
  ],
  ARRIVED: [
    {
      to: 'IN_PROGRESS',
      by: ['PROFESSIONAL'],
      needsReason: false,
      notify: 'customer',
      title: 'Service started',
      message: () => 'Work has started on your booking.',
    },
    {
      to: 'CANCELLED',
      by: ['CUSTOMER'],
      needsReason: false,
      notify: 'provider',
      title: 'Booking cancelled',
      message: () => 'The customer cancelled the booking.',
    },
  ],
  IN_PROGRESS: [
    {
      to: 'COMPLETED',
      by: ['PROFESSIONAL'],
      needsReason: false,
      notify: 'customer',
      title: 'Service completed',
      message: () => 'Your service is marked completed. You can now rate it.',
    },
  ],
  REJECTED: [],
  CANCELLED: [],
  COMPLETED: [],
};

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    @Inject(SUPABASE_SERVICE) private readonly client: SupabaseServiceClient,
    private readonly storage: StorageService,
    private readonly notifications: NotificationsService,
  ) {}

  // -------------------------------------------------------------------------
  // Creation
  // -------------------------------------------------------------------------

  async create(customerId: string, dto: CreateBookingDto): Promise<BookingResponseDto> {
    const scheduledAt = this.parseFutureDate(dto.scheduledAt);

    // Idempotent retries return the original booking.
    if (dto.idempotencyKey) {
      const existing = await this.findByIdempotencyKey(dto.idempotencyKey);
      if (existing) {
        if (existing.customer_id !== customerId) {
          throw new ConflictException('This idempotency key was used by another account.');
        }
        return this.toResponse(existing);
      }
    }

    const { service, provider, home } = await this.loadBookingContext(
      dto.serviceId,
      dto.providerId,
      dto.homeId ?? null,
      customerId,
    );

    const address = (dto.address?.trim() || home?.address || '').trim();
    if (address.length < 5) {
      throw new BadRequestException(
        'A service address is required: pick a saved home or provide one.',
      );
    }

    if (
      (dto.latitude === undefined && dto.longitude !== undefined) ||
      (dto.latitude !== undefined && dto.longitude === undefined)
    ) {
      throw new BadRequestException('Latitude and longitude must be provided together.');
    }

    const { data, error } = await this.client
      .from('bookings')
      .insert({
        customer_id: customerId,
        provider_id: provider.id,
        service_id: service.id,
        home_id: home?.id ?? null,
        address_snapshot: address,
        latitude: dto.latitude ?? home?.latitude ?? null,
        longitude: dto.longitude ?? home?.longitude ?? null,
        scheduled_at: scheduledAt.toISOString(),
        problem_description: dto.problemDescription.trim(),
        urgency: dto.urgency ?? 'NORMAL',
        status: 'REQUESTED',
        idempotency_key: dto.idempotencyKey ?? null,
      })
      .select('*')
      .single();
    assertNoError(error);

    const booking = data as BookingRow;
    await this.recordHistory(booking.id, null, 'REQUESTED', customerId, null);

    await this.notifications
      .createForUser(
        provider.user_id,
        'New booking request',
        `A customer requested ${service.service_name} on ${scheduledAt.toDateString()}.`,
        'BOOKING_REQUEST',
      )
      .catch((err: Error) => this.logger.warn(`Booking notification failed: ${err.message}`));

    return this.toResponse(booking);
  }

  // -------------------------------------------------------------------------
  // Reads
  // -------------------------------------------------------------------------

  async listForUser(
    user: AuthenticatedUser,
    query: ListBookingsQueryDto,
  ): Promise<{ items: BookingResponseDto[]; total: number }> {
    const limit = query.limit ?? 25;
    const offset = query.offset ?? 0;

    let builder = this.client.from('bookings').select('*', { count: 'exact' });

    if (user.role === 'PROFESSIONAL') {
      const providerId = await this.providerIdFor(user.id);
      builder = builder.eq('provider_id', providerId);
    } else if (user.role === 'ADMIN') {
      // Admins see everything; no extra filter.
    } else {
      builder = builder.eq('customer_id', user.id);
    }

    if (query.status) {
      builder = builder.eq('status', query.status);
    }

    const { data, error, count } = await builder
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    assertNoError(error);

    const items = await Promise.all(
      ((data ?? []) as BookingRow[]).map((row) => this.toResponse(row)),
    );
    return { items, total: count ?? items.length };
  }

  async getForUser(bookingId: string, user: AuthenticatedUser): Promise<BookingResponseDto> {
    return this.toResponse(await this.requireVisibleBooking(bookingId, user));
  }

  // -------------------------------------------------------------------------
  // Status transitions
  // -------------------------------------------------------------------------

  async updateStatus(
    bookingId: string,
    user: AuthenticatedUser,
    dto: UpdateBookingStatusDto,
  ): Promise<BookingResponseDto> {
    const booking = await this.requireVisibleBooking(bookingId, user);
    const actor = await this.resolveActor(booking, user);

    const rule = (TRANSITIONS[booking.status] ?? []).find((r) => r.to === dto.status);
    if (!rule) {
      throw new BadRequestException(`Cannot move a ${booking.status} booking to ${dto.status}.`);
    }
    if (!actor || !rule.by.includes(actor)) {
      throw new ForbiddenException(
        `Only the ${rule.by.join(' or ').toLowerCase()} can perform this action.`,
      );
    }
    if (rule.needsReason && !dto.reason?.trim()) {
      throw new BadRequestException('A reason is required for this action.');
    }

    const now = new Date().toISOString();
    const { error } = await this.client
      .from('bookings')
      .update({ status: dto.status, status_updated_at: now })
      .eq('id', bookingId);
    assertNoError(error);

    await this.recordHistory(
      bookingId,
      booking.status,
      dto.status,
      user.id,
      dto.reason?.trim() ?? null,
    );

    const recipient =
      rule.notify === 'customer'
        ? booking.customer_id
        : await this.providerUserId(booking.provider_id);
    const reasonSuffix = dto.reason?.trim() ? `\n\nReason: ${dto.reason.trim()}` : '';
    await this.notifications
      .createForUser(
        recipient,
        rule.title,
        `${rule.message(booking)}${reasonSuffix}`,
        'BOOKING_STATUS',
      )
      .catch((err: Error) => this.logger.warn(`Status notification failed: ${err.message}`));

    return this.getForUser(bookingId, user);
  }

  // -------------------------------------------------------------------------
  // Problem photos
  // -------------------------------------------------------------------------

  async addPhotos(
    bookingId: string,
    user: AuthenticatedUser,
    files: Express.Multer.File[],
  ): Promise<BookingResponseDto> {
    const booking = await this.requireVisibleBooking(bookingId, user);

    if (booking.customer_id !== user.id) {
      throw new ForbiddenException('Only the customer can add problem photos.');
    }
    if (booking.status !== 'REQUESTED') {
      throw new BadRequestException('Photos can only be added while the booking is requested.');
    }
    if (files.length === 0) {
      throw new BadRequestException('At least one photo must be uploaded.');
    }
    if (files.length > 3) {
      throw new BadRequestException('At most 3 problem photos are allowed.');
    }

    for (const file of files) {
      const uploaded = await this.storage.uploadImage(user.id, BUCKETS.bookingPhotos, file);
      const { error } = await this.client.from('booking_photos').insert({
        booking_id: bookingId,
        storage_path: uploaded.path,
        original_filename: file.originalname,
        mime_type: uploaded.mimeType,
        size_bytes: uploaded.size,
      });
      assertNoError(error);
    }

    return this.getForUser(bookingId, user);
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  /** Resolves whether the caller acts as the assigned professional. */
  private async isAssignedProvider(booking: BookingRow, userId: string): Promise<boolean> {
    const { data } = await this.client
      .from('service_providers')
      .select('id')
      .eq('id', booking.provider_id)
      .eq('user_id', userId)
      .maybeSingle();
    return !!data;
  }

  private async requireVisibleBooking(
    bookingId: string,
    user: AuthenticatedUser,
  ): Promise<BookingRow> {
    const { data, error } = await this.client
      .from('bookings')
      .select('*')
      .eq('id', bookingId)
      .maybeSingle();
    assertNoError(error);

    if (!data) {
      throw new NotFoundException('Booking not found.');
    }

    const booking = data as BookingRow;

    if (user.role === 'ADMIN') return booking;
    if (booking.customer_id === user.id) return booking;
    if (await this.isAssignedProvider(booking, user.id)) return booking;

    throw new ForbiddenException('This booking belongs to another account.');
  }

  /**
   * Determines the caller's side for transition authorization. Professionals
   * are matched through their provider record, never through a client flag.
   */
  async resolveActor(
    booking: BookingRow,
    user: AuthenticatedUser,
  ): Promise<'CUSTOMER' | 'PROFESSIONAL'> {
    if (booking.customer_id === user.id) return 'CUSTOMER';
    if (await this.isAssignedProvider(booking, user.id)) return 'PROFESSIONAL';
    throw new ForbiddenException('This booking belongs to another account.');
  }

  private async loadBookingContext(
    serviceId: string,
    providerId: string,
    homeId: string | null,
    customerId: string,
  ): Promise<{
    service: { id: string; service_name: string; domain_id: string };
    provider: { id: string; user_id: string };
    home: {
      id: string;
      address: string;
      latitude: number | null;
      longitude: number | null;
    } | null;
  }> {
    const [{ data: service }, { data: provider }] = await Promise.all([
      this.client
        .from('services')
        .select('id, service_name, domain_id')
        .eq('id', serviceId)
        .eq('is_active', true)
        .maybeSingle(),
      this.client
        .from('service_providers')
        .select('id, user_id, verification_status')
        .eq('id', providerId)
        .maybeSingle(),
    ]);

    if (!service) {
      throw new BadRequestException('The selected service is not available.');
    }
    const providerRow = provider as {
      id: string;
      user_id: string;
      verification_status: string;
    } | null;
    if (!providerRow) {
      throw new NotFoundException('Service provider not found.');
    }
    if (providerRow.verification_status !== 'APPROVED') {
      throw new BadRequestException('This professional is not approved to accept bookings.');
    }

    const { data: skill } = await this.client
      .from('provider_skills')
      .select('id')
      .eq('provider_id', providerId)
      .eq('service_id', serviceId)
      .maybeSingle();
    if (!skill) {
      throw new BadRequestException('This professional does not offer the selected service.');
    }

    let home: {
      id: string;
      address: string;
      latitude: number | null;
      longitude: number | null;
    } | null = null;

    if (homeId) {
      const { data: homeRow } = await this.client
        .from('customer_homes')
        .select('id, address, latitude, longitude, customer_id')
        .eq('id', homeId)
        .maybeSingle();
      const owned = homeRow as { customer_id: string } | null;
      if (!owned || owned.customer_id !== customerId) {
        throw new BadRequestException('The selected home address is not yours.');
      }
      home = homeRow as {
        id: string;
        address: string;
        latitude: number | null;
        longitude: number | null;
      };
    }

    return {
      service: service as { id: string; service_name: string; domain_id: string },
      provider: { id: providerRow.id, user_id: providerRow.user_id },
      home,
    };
  }

  private parseFutureDate(value: string): Date {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('scheduledAt must be a valid date and time.');
    }
    if (date.getTime() <= Date.now() + 60_000) {
      throw new BadRequestException(
        'The booking must be scheduled at least an hour in the future.',
      );
    }
    return date;
  }

  private async findByIdempotencyKey(key: string): Promise<BookingRow | null> {
    const { data } = await this.client
      .from('bookings')
      .select('*')
      .eq('idempotency_key', key)
      .maybeSingle();
    return (data as BookingRow | null) ?? null;
  }

  private async providerIdFor(userId: string): Promise<string> {
    const { data } = await this.client
      .from('service_providers')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    if (!data) {
      throw new NotFoundException('No service provider profile exists for this account.');
    }
    return (data as { id: string }).id;
  }

  private async providerUserId(providerId: string): Promise<string> {
    const { data } = await this.client
      .from('service_providers')
      .select('user_id')
      .eq('id', providerId)
      .maybeSingle();
    if (!data) throw new NotFoundException('Service provider not found.');
    return (data as { user_id: string }).user_id;
  }

  private async recordHistory(
    bookingId: string,
    oldStatus: BookingStatus | null,
    newStatus: BookingStatus,
    changedBy: string,
    reason: string | null,
  ): Promise<void> {
    const { error } = await this.client.from('booking_status_history').insert({
      booking_id: bookingId,
      old_status: oldStatus,
      new_status: newStatus,
      changed_by: changedBy,
      reason,
    });
    assertNoError(error);
  }

  async toResponse(booking: BookingRow): Promise<BookingResponseDto> {
    const { data: providerLink } = await this.client
      .from('service_providers')
      .select('user_id')
      .eq('id', booking.provider_id)
      .maybeSingle();

    const providerUserId = (providerLink as { user_id: string } | null)?.user_id ?? '';

    const [{ data: service }, { data: profile }, { data: history }, { data: photos }] =
      await Promise.all([
        this.client
          .from('services')
          .select('service_name')
          .eq('id', booking.service_id)
          .maybeSingle(),
        providerUserId
          ? this.client.from('profiles').select('full_name').eq('id', providerUserId).maybeSingle()
          : Promise.resolve({ data: null }),
        this.client
          .from('booking_status_history')
          .select('old_status, new_status, created_at')
          .eq('booking_id', booking.id)
          .order('created_at', { ascending: true }),
        this.client.from('booking_photos').select('storage_path').eq('booking_id', booking.id),
      ]);

    const photoUrls: string[] = [];
    for (const row of (photos ?? []) as { storage_path: string }[]) {
      try {
        photoUrls.push(
          await this.storage.createSignedUrl(BUCKETS.bookingPhotos, row.storage_path, 300),
        );
      } catch {
        this.logger.warn(`Signed URL unavailable for booking photo ${row.storage_path}`);
      }
    }

    return {
      id: booking.id,
      customerId: booking.customer_id,
      providerId: booking.provider_id,
      serviceId: booking.service_id,
      serviceName: (service as { service_name: string } | null)?.service_name ?? null,
      providerName: (profile as { full_name: string } | null)?.full_name ?? null,
      homeId: booking.home_id,
      address: booking.address_snapshot,
      latitude: booking.latitude,
      longitude: booking.longitude,
      scheduledAt: booking.scheduled_at,
      problemDescription: booking.problem_description,
      urgency: booking.urgency,
      status: booking.status,
      statusUpdatedAt: booking.status_updated_at,
      history: ((history ?? []) as BookingStatusHistoryRow[]).map((h) => ({
        oldStatus: h.old_status,
        newStatus: h.new_status,
        createdAt: h.created_at,
      })),
      photoUrls,
      createdAt: booking.created_at,
    };
  }
}

export { TRANSITIONS };
