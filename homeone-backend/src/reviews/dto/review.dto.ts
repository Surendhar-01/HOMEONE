import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class CreateReviewDto {
  @ApiProperty({ format: 'uuid', description: 'Completed booking to review.' })
  @IsUUID('4', { message: 'bookingId must be a valid identifier.' })
  bookingId!: string;

  @ApiProperty({ example: 5, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating!: number;

  @ApiPropertyOptional({ example: 'Thorough work, on time. Highly recommended.', maxLength: 1000 })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}

export class ReviewResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  bookingId!: string;

  @ApiProperty()
  providerId!: string;

  @ApiProperty({ example: 5 })
  rating!: number;

  @ApiProperty({ nullable: true })
  comment!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ type: [String], description: 'Signed review photo URLs (5 minutes).' })
  photoUrls!: string[];
}

export class ProviderRatingSummaryDto {
  @ApiProperty({ example: 4.6, description: 'Average rating, null when no reviews exist.' })
  averageRating!: number | null;

  @ApiProperty({ example: 23 })
  totalReviews!: number;
}

export class PublicReviewResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 5 })
  rating!: number;

  @ApiProperty({ nullable: true })
  comment!: string | null;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}
