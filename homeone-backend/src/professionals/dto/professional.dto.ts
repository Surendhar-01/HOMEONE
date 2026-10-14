import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class DiscoverProfessionalsQueryDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Only professionals offering this service are returned.',
  })
  @IsUUID('4')
  serviceId!: string;

  @ApiPropertyOptional({ example: 12.9716, description: 'Customer latitude for distance sorting.' })
  @IsOptional()
  @Type(() => Number)
  latitude?: number;

  @ApiPropertyOptional({ example: 77.5946 })
  @IsOptional()
  @Type(() => Number)
  longitude?: number;

  @ApiPropertyOptional({ example: 25, minimum: 1, maximum: 50, default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  limit?: number;

  @ApiPropertyOptional({ example: 0, minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}

export class ProfessionalCardDto {
  @ApiProperty()
  providerId!: string;

  @ApiProperty({ example: 'Ravi Kumar' })
  providerName!: string;

  @ApiProperty({ nullable: true, description: 'Signed profile photo URL (15 minutes).' })
  profilePhotoUrl!: string | null;

  @ApiProperty({ example: 'Cleaning Services' })
  domainName!: string | null;

  @ApiProperty({ type: [String], example: ['Deep Cleaning'] })
  skills!: string[];

  @ApiProperty({ example: 6 })
  yearsOfExperience!: number;

  @ApiProperty({ type: [String] })
  languagesSpoken!: string[];

  @ApiProperty({ example: true })
  isOnline!: boolean;

  @ApiProperty({ example: 4.6, nullable: true, description: 'Average rating, null when unrated.' })
  averageRating!: number | null;

  @ApiProperty({ example: 23 })
  totalReviews!: number;

  @ApiProperty({
    example: 2.4,
    nullable: true,
    description: 'Distance in km when customer coordinates are supplied.',
  })
  distanceKm!: number | null;

  @ApiProperty({ nullable: true, description: 'Business latitude for map pins.' })
  latitude!: number | null;

  @ApiProperty({ nullable: true, description: 'Business longitude for map pins.' })
  longitude!: number | null;
}

export class ProfessionalProfileDto extends ProfessionalCardDto {
  @ApiProperty()
  businessAddress!: string;

  @ApiProperty({ type: [Object], description: 'Working hours rows.' })
  workingHours!: { dayOfWeek: number; startTime: string; endTime: string }[];

  @ApiProperty({ description: 'True when a professional certificate is on file.' })
  hasCertificate!: boolean;

  @ApiProperty({ type: [String], description: 'Signed work photo URLs (5 minutes).' })
  workPhotoUrls!: string[];

  @ApiProperty({
    type: [Object],
    description: 'Public reviews: rating + comment only, never customer identities.',
  })
  reviews!: { rating: number; comment: string | null; createdAt: string }[];
}
