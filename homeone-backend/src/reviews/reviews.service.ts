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
import type { ReviewRow } from '../database/database.types';
import { assertNoError } from '../database/supabase-error.util';
import { BUCKETS, StorageService } from '../storage/storage.service';
import { NotificationsService } from '../notifications/notifications.service';
import type {
  CreateReviewDto,
  ProviderRatingSummaryDto,
  ReviewResponseDto,
} from './dto/review.dto';

export interface PublicReviewDto {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    @Inject(SUPABASE_SERVICE) private readonly client: SupabaseServiceClient,
    private readonly storage: StorageService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Exactly one review per completed booking, written by the booking customer.
   * The UNIQUE constraint on reviews.booking_id is the final guard.
   */
  async create(customerId: string, dto: CreateReviewDto): Promise<ReviewResponseDto> {
    const { data: booking } = await this.client
      .from('bookings')
      .select('id, customer_id, provider_id, status')
      .eq('id', dto.bookingId)
      .maybeSingle();

    const row = booking as {
      id: string;
      customer_id: string;
      provider_id: string;
      status: string;
    } | null;

    if (!row) {
      throw new NotFoundException('Booking not found.');
    }
    if (row.customer_id !== customerId) {
      throw new ForbiddenException('Only the booking customer can review it.');
    }
    if (row.status !== 'COMPLETED') {
      throw new BadRequestException('Only completed bookings can be reviewed.');
    }

    const { data: existing } = await this.client
      .from('reviews')
      .select('id')
      .eq('booking_id', dto.bookingId)
      .maybeSingle();
    if (existing) {
      throw new ConflictException('This booking has already been reviewed.');
    }

    const { data, error } = await this.client
      .from('reviews')
      .insert({
        booking_id: dto.bookingId,
        provider_id: row.provider_id,
        customer_id: customerId,
        rating: dto.rating,
        comment: dto.comment?.trim() || null,
      })
      .select('*')
      .single();

    if (error?.code === '23505') {
      throw new ConflictException('This booking has already been reviewed.');
    }
    assertNoError(error);

    const review = data as ReviewRow;

    const { data: provider } = await this.client
      .from('service_providers')
      .select('user_id')
      .eq('id', row.provider_id)
      .maybeSingle();

    if (provider) {
      await this.notifications
        .createForUser(
          (provider as { user_id: string }).user_id,
          'New customer review',
          `A customer rated your work ${dto.rating} out of 5.`,
          'REVIEW',
        )
        .catch((err: Error) => this.logger.warn(`Review notification failed: ${err.message}`));
    }

    return this.toResponse(review);
  }

  async addPhotos(
    reviewId: string,
    customerId: string,
    files: Express.Multer.File[],
  ): Promise<ReviewResponseDto> {
    const review = await this.requireOwnedReview(reviewId, customerId);

    if (files.length === 0) {
      throw new BadRequestException('At least one photo must be uploaded.');
    }
    if (files.length > 3) {
      throw new BadRequestException('At most 3 review photos are allowed.');
    }

    for (const file of files) {
      const uploaded = await this.storage.uploadImage(customerId, BUCKETS.bookingPhotos, file);
      const { error } = await this.client.from('review_photos').insert({
        review_id: reviewId,
        storage_path: uploaded.path,
      });
      assertNoError(error);
    }

    return this.toResponse(review);
  }

  async listMine(customerId: string): Promise<ReviewResponseDto[]> {
    const { data, error } = await this.client
      .from('reviews')
      .select('*')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false });
    assertNoError(error);

    return Promise.all(((data ?? []) as ReviewRow[]).map((row) => this.toResponse(row)));
  }

  /** Public, customer-safe review list for a professional profile. */
  async listForProvider(providerId: string): Promise<PublicReviewDto[]> {
    const { data, error } = await this.client
      .from('reviews')
      .select('id, rating, comment, created_at')
      .eq('provider_id', providerId)
      .order('created_at', { ascending: false })
      .limit(50);
    assertNoError(error);

    return (
      (data ?? []) as { id: string; rating: number; comment: string | null; created_at: string }[]
    ).map((row) => ({
      id: row.id,
      rating: row.rating,
      comment: row.comment,
      createdAt: row.created_at,
    }));
  }

  async ratingSummary(providerId: string): Promise<ProviderRatingSummaryDto> {
    const { data, error } = await this.client
      .from('reviews')
      .select('rating')
      .eq('provider_id', providerId);
    assertNoError(error);

    const ratings = ((data ?? []) as { rating: number }[]).map((r) => r.rating);
    if (!ratings.length) {
      return { averageRating: null, totalReviews: 0 };
    }
    const average = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;
    return { averageRating: Math.round(average * 10) / 10, totalReviews: ratings.length };
  }

  private async requireOwnedReview(reviewId: string, customerId: string): Promise<ReviewRow> {
    const { data, error } = await this.client
      .from('reviews')
      .select('*')
      .eq('id', reviewId)
      .maybeSingle();
    assertNoError(error);

    if (!data) {
      throw new NotFoundException('Review not found.');
    }
    const review = data as ReviewRow;
    if (review.customer_id !== customerId) {
      throw new ForbiddenException('This review belongs to another account.');
    }
    return review;
  }

  private async toResponse(review: ReviewRow): Promise<ReviewResponseDto> {
    const { data: photos } = await this.client
      .from('review_photos')
      .select('storage_path')
      .eq('review_id', review.id);

    const photoUrls: string[] = [];
    for (const row of (photos ?? []) as { storage_path: string }[]) {
      try {
        photoUrls.push(
          await this.storage.createSignedUrl(BUCKETS.bookingPhotos, row.storage_path, 300),
        );
      } catch {
        this.logger.warn(`Signed URL unavailable for review photo ${row.storage_path}`);
      }
    }

    return {
      id: review.id,
      bookingId: review.booking_id,
      providerId: review.provider_id,
      rating: review.rating,
      comment: review.comment,
      createdAt: review.created_at,
      photoUrls,
    };
  }
}
