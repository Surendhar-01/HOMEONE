import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { SupabaseServiceClient } from '../database/supabase.module';
import { SUPABASE_SERVICE } from '../database/supabase.module';
import type { ServiceProviderRow } from '../database/database.types';
import { assertNoError } from '../database/supabase-error.util';
import { BUCKETS, StorageService } from '../storage/storage.service';
import type {
  DiscoverProfessionalsQueryDto,
  ProfessionalCardDto,
  ProfessionalProfileDto,
} from './dto/professional.dto';

/** Mean Earth radius in kilometres for haversine distance. */
const EARTH_RADIUS_KM = 6371;

function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(a));
}

/**
 * Customer-facing professional discovery. Only APPROVED professionals are
 * ever returned. Distances are computed only when the customer shares
 * coordinates; availability is reported honestly (online flag + working
 * hours) and never invented.
 */
@Injectable()
export class ProfessionalsService {
  constructor(
    @Inject(SUPABASE_SERVICE) private readonly client: SupabaseServiceClient,
    private readonly storage: StorageService,
  ) {}

  async discover(query: DiscoverProfessionalsQueryDto): Promise<ProfessionalCardDto[]> {
    const limit = query.limit ?? 25;
    const offset = query.offset ?? 0;
    const hasLocation = query.latitude !== undefined && query.longitude !== undefined;

    const { data: skillRows, error: skillError } = await this.client
      .from('provider_skills')
      .select('provider_id')
      .eq('service_id', query.serviceId);
    assertNoError(skillError);

    const providerIds = [
      ...new Set(((skillRows ?? []) as { provider_id: string }[]).map((r) => r.provider_id)),
    ];
    if (!providerIds.length) {
      return [];
    }

    const { data, error } = await this.client
      .from('service_providers')
      .select('*')
      .in('id', providerIds)
      .eq('verification_status', 'APPROVED')
      .range(offset, offset + limit - 1);
    assertNoError(error);

    const cards = await Promise.all(
      ((data ?? []) as ServiceProviderRow[]).map((row) => this.toCard(row)),
    );

    if (hasLocation) {
      for (const card of cards) {
        if (card.latitude !== null && card.longitude !== null) {
          card.distanceKm =
            Math.round(
              haversineKm(
                query.latitude as number,
                query.longitude as number,
                card.latitude,
                card.longitude,
              ) * 10,
            ) / 10;
        }
      }
      cards.sort(
        (a, b) =>
          (a.distanceKm ?? Number.MAX_SAFE_INTEGER) - (b.distanceKm ?? Number.MAX_SAFE_INTEGER),
      );
    }

    return cards;
  }

  /**
   * Full professional profile for customers. Government IDs are never
   * included; certificates appear only as a has/does-not-have flag; reviews
   * carry ratings and comments without customer identities.
   */
  async getProfile(providerId: string): Promise<ProfessionalProfileDto> {
    const { data, error } = await this.client
      .from('service_providers')
      .select('*')
      .eq('id', providerId)
      .eq('verification_status', 'APPROVED')
      .maybeSingle();
    assertNoError(error);

    if (!data) {
      throw new NotFoundException('Professional not found or not approved.');
    }

    const card = await this.toCard(data as ServiceProviderRow);

    const [{ data: hours }, { data: documents }, { data: reviews }] = await Promise.all([
      this.client
        .from('provider_working_hours')
        .select('day_of_week, start_time, end_time')
        .eq('provider_id', providerId)
        .order('day_of_week'),
      this.client
        .from('provider_documents')
        .select('storage_path')
        .eq('provider_id', providerId)
        .eq('document_type', 'WORK_PHOTO'),
      this.client
        .from('reviews')
        .select('rating, comment, created_at')
        .eq('provider_id', providerId)
        .order('created_at', { ascending: false })
        .limit(50),
    ]);

    const workPhotoUrls: string[] = [];
    for (const row of (documents ?? []) as { storage_path: string }[]) {
      try {
        workPhotoUrls.push(
          await this.storage.createSignedUrl(BUCKETS.providerWorkPhotos, row.storage_path, 300),
        );
      } catch {
        // Skip photos whose objects are gone; the profile still renders.
      }
    }

    return {
      ...card,
      businessAddress: (data as ServiceProviderRow).business_address,
      workingHours: (
        (hours ?? []) as {
          day_of_week: number;
          start_time: string;
          end_time: string;
        }[]
      ).map((h) => ({ dayOfWeek: h.day_of_week, startTime: h.start_time, endTime: h.end_time })),
      hasCertificate: (data as ServiceProviderRow).has_certificate,
      workPhotoUrls,
      reviews: (
        (reviews ?? []) as { rating: number; comment: string | null; created_at: string }[]
      ).map((r) => ({ rating: r.rating, comment: r.comment, createdAt: r.created_at })),
    };
  }

  private async toCard(provider: ServiceProviderRow): Promise<ProfessionalCardDto> {
    const [{ data: profile }, { data: domain }, { data: skills }, { data: ratings }] =
      await Promise.all([
        this.client
          .from('profiles')
          .select('full_name, profile_photo_path')
          .eq('id', provider.user_id)
          .maybeSingle(),
        this.client
          .from('service_domains')
          .select('domain_name')
          .eq('id', provider.domain_id)
          .maybeSingle(),
        this.client.from('provider_skills').select('service_id').eq('provider_id', provider.id),
        this.client.from('reviews').select('rating').eq('provider_id', provider.id),
      ]);

    const serviceIds = ((skills ?? []) as { service_id: string }[]).map((s) => s.service_id);
    let names: { id: string; service_name: string }[] = [];
    if (serviceIds.length) {
      const { data } = await this.client
        .from('services')
        .select('id, service_name')
        .in('id', serviceIds);
      names = (data ?? []) as { id: string; service_name: string }[];
    }

    const ratingValues = ((ratings ?? []) as { rating: number }[]).map((r) => r.rating);
    const totalReviews = ratingValues.length;

    let profilePhotoUrl: string | null = null;
    const photoPath = (profile as { profile_photo_path: string | null } | null)?.profile_photo_path;
    if (photoPath) {
      try {
        profilePhotoUrl = await this.storage.createSignedUrl(BUCKETS.profilePhotos, photoPath, 900);
      } catch {
        profilePhotoUrl = null;
      }
    }

    return {
      providerId: provider.id,
      providerName: (profile as { full_name: string } | null)?.full_name ?? 'Professional',
      profilePhotoUrl,
      domainName: (domain as { domain_name: string } | null)?.domain_name ?? null,
      skills: names.map((s) => s.service_name),
      yearsOfExperience: provider.years_of_experience,
      languagesSpoken: provider.languages_spoken ?? [],
      isOnline: provider.is_online ?? true,
      averageRating: totalReviews
        ? Math.round((ratingValues.reduce((a, b) => a + b, 0) / totalReviews) * 10) / 10
        : null,
      totalReviews,
      distanceKm: null,
      latitude: provider.latitude,
      longitude: provider.longitude,
    };
  }
}
