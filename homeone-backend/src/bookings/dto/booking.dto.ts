import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';
import type { BookingStatus, BookingUrgency } from '../../database/database.types';

export class CreateBookingDto {
  @ApiProperty({ format: 'uuid', description: 'Service being booked.' })
  @IsUUID('4', { message: 'serviceId must be a valid identifier.' })
  serviceId!: string;

  @ApiProperty({ format: 'uuid', description: 'Approved professional offering the service.' })
  @IsUUID('4', { message: 'providerId must be a valid identifier.' })
  providerId!: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Saved home to serve. Omit to use a one-off address.',
  })
  @IsOptional()
  @IsUUID('4')
  homeId?: string;

  @ApiPropertyOptional({
    example: 'Flat 402, 12 MG Road, Bengaluru',
    description:
      'Address text. Required when homeId is omitted; overrides the saved text otherwise.',
  })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  address?: string;

  @ApiPropertyOptional({ example: 12.9716 })
  @IsOptional()
  latitude?: number;

  @ApiPropertyOptional({ example: 77.5946 })
  @IsOptional()
  longitude?: number;

  @ApiProperty({
    example: '2026-12-01T10:00:00.000Z',
    description: 'Requested start time. Must be in the future.',
  })
  @IsString()
  scheduledAt!: string;

  @ApiProperty({
    example: 'The kitchen tap leaks continuously and the sink drains slowly.',
    minLength: 10,
    maxLength: 2000,
  })
  @IsString()
  @MinLength(10, { message: 'Describe the problem in at least 10 characters.' })
  @MaxLength(2000)
  problemDescription!: string;

  @ApiPropertyOptional({ enum: ['NORMAL', 'HIGH', 'URGENT'], default: 'NORMAL' })
  @IsOptional()
  @IsEnum(['NORMAL', 'HIGH', 'URGENT'])
  urgency?: BookingUrgency;

  @ApiPropertyOptional({
    format: 'uuid',
    description:
      'Client-generated key for safe retries. Repeating a request with the same key returns the original booking instead of creating a duplicate.',
  })
  @IsOptional()
  @IsUUID('4')
  idempotencyKey?: string;
}

export class UpdateBookingStatusDto {
  @ApiProperty({
    enum: [
      'ACCEPTED',
      'REJECTED',
      'CANCELLED',
      'ON_THE_WAY',
      'ARRIVED',
      'IN_PROGRESS',
      'COMPLETED',
    ],
  })
  @IsEnum([
    'ACCEPTED',
    'REJECTED',
    'CANCELLED',
    'ON_THE_WAY',
    'ARRIVED',
    'IN_PROGRESS',
    'COMPLETED',
  ])
  status!: Exclude<BookingStatus, 'REQUESTED'>;

  @ApiPropertyOptional({
    example: 'Fully booked that day, please pick another slot.',
    description: 'Required when rejecting. Optional otherwise.',
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export class ListBookingsQueryDto {
  @ApiPropertyOptional({
    enum: [
      'REQUESTED',
      'ACCEPTED',
      'REJECTED',
      'CANCELLED',
      'ON_THE_WAY',
      'ARRIVED',
      'IN_PROGRESS',
      'COMPLETED',
    ],
  })
  @IsOptional()
  @IsEnum([
    'REQUESTED',
    'ACCEPTED',
    'REJECTED',
    'CANCELLED',
    'ON_THE_WAY',
    'ARRIVED',
    'IN_PROGRESS',
    'COMPLETED',
  ])
  status?: BookingStatus;

  @ApiPropertyOptional({ example: 25, minimum: 1, maximum: 100, default: 25 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ example: 0, minimum: 0, default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  offset?: number;
}

export class BookingHistoryDto {
  @ApiProperty({ nullable: true })
  oldStatus!: string | null;

  @ApiProperty()
  newStatus!: string;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

export class BookingResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  customerId!: string;

  @ApiProperty()
  providerId!: string;

  @ApiProperty()
  serviceId!: string;

  @ApiProperty({ example: 'Deep Cleaning' })
  serviceName!: string | null;

  @ApiProperty({
    example: 'Ravi Kumar',
    description: 'Professional name (no private contact details).',
  })
  providerName!: string | null;

  @ApiProperty({ nullable: true })
  homeId!: string | null;

  @ApiProperty()
  address!: string;

  @ApiProperty({ nullable: true })
  latitude!: number | null;

  @ApiProperty({ nullable: true })
  longitude!: number | null;

  @ApiProperty({ format: 'date-time' })
  scheduledAt!: string;

  @ApiProperty()
  problemDescription!: string;

  @ApiProperty({ enum: ['NORMAL', 'HIGH', 'URGENT'] })
  urgency!: string;

  @ApiProperty({
    enum: [
      'REQUESTED',
      'ACCEPTED',
      'REJECTED',
      'CANCELLED',
      'ON_THE_WAY',
      'ARRIVED',
      'IN_PROGRESS',
      'COMPLETED',
    ],
  })
  status!: string;

  @ApiProperty({ format: 'date-time' })
  statusUpdatedAt!: string;

  @ApiProperty({ type: [BookingHistoryDto] })
  history!: BookingHistoryDto[];

  @ApiProperty({ type: [String], description: 'Signed URLs of problem photos (5 minutes).' })
  photoUrls!: string[];

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}
