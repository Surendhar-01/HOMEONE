import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';

export class ReviewActionDto {
  @ApiProperty({
    example: 'The government ID photo is unreadable. Please upload a clearer scan.',
    description:
      'Required when rejecting or blocking. Stored with the audit record and shown to the provider.',
    minLength: 3,
    maxLength: 500,
  })
  @IsString()
  @MinLength(3, { message: 'A reason of at least 3 characters is required.' })
  @MaxLength(500)
  reason!: string;
}

export class PendingProviderDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'Ravi Kumar', nullable: true })
  fullName!: string | null;

  @ApiProperty({ example: 'Cleaning Services', nullable: true })
  domainName!: string | null;

  @ApiProperty({ example: 6 })
  yearsOfExperience!: number;

  @ApiProperty({ type: [String], example: ['Tamil', 'English'] })
  languagesSpoken!: string[];

  @ApiProperty({ format: 'date-time', nullable: true })
  submittedAt!: string | null;

  @ApiProperty({ enum: ['PENDING'] })
  verificationStatus!: string;
}

export class PendingProviderListDto {
  @ApiProperty({ type: [PendingProviderDto] })
  items!: PendingProviderDto[];

  @ApiProperty({ example: 12 })
  total!: number;

  @ApiProperty({ example: 50 })
  limit!: number;

  @ApiProperty({ example: 0 })
  offset!: number;
}

export class VerificationActionResponseDto {
  @ApiProperty()
  providerId!: string;

  @ApiProperty({ enum: ['PENDING', 'APPROVED', 'REJECTED', 'BLOCKED'] })
  oldStatus!: string;

  @ApiProperty({ enum: ['PENDING', 'APPROVED', 'REJECTED', 'BLOCKED'] })
  newStatus!: string;

  @ApiProperty({ nullable: true })
  reason!: string | null;

  @ApiProperty({ format: 'date-time' })
  reviewedAt!: string;

  @ApiProperty({ example: 'Approved' })
  title!: string;

  @ApiProperty({
    example:
      'Congratulations! Your service provider account has been approved. You can now access your service provider dashboard.',
  })
  message!: string;
}

export class VerificationHistoryDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ nullable: true })
  oldStatus!: string | null;

  @ApiProperty()
  newStatus!: string;

  @ApiProperty({ nullable: true })
  reason!: string | null;

  @ApiProperty({ description: 'Admin user id who performed the action.' })
  reviewedBy!: string;

  @ApiProperty({ format: 'date-time' })
  reviewedAt!: string;
}

export class WorkingHourViewDto {
  @ApiProperty({ example: 1 })
  dayOfWeek!: number;

  @ApiProperty({ example: '09:00' })
  startTime!: string;

  @ApiProperty({ example: '18:00' })
  endTime!: string;
}

export class AdminProviderDetailDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  userId!: string;

  @ApiProperty({ example: 'Ravi Kumar', nullable: true })
  fullName!: string | null;

  @ApiProperty({ example: '+919876543210', nullable: true })
  mobileNumber!: string | null;

  @ApiProperty({ example: 'ravi@example.com', nullable: true })
  email!: string | null;

  @ApiProperty({ example: 'Cleaning Services', nullable: true })
  domainName!: string | null;

  @ApiProperty({ type: [String], example: ['Deep Cleaning'] })
  skills!: string[];

  @ApiProperty()
  yearsOfExperience!: number;

  @ApiProperty({ type: [String] })
  languagesSpoken!: string[];

  @ApiProperty()
  businessAddress!: string;

  @ApiProperty({ nullable: true, example: 12.9716 })
  latitude!: number | null;

  @ApiProperty({ nullable: true, example: 77.5946 })
  longitude!: number | null;

  @ApiProperty({ type: [WorkingHourViewDto] })
  workingHours!: WorkingHourViewDto[];

  @ApiProperty({ enum: ['PENDING', 'APPROVED', 'REJECTED', 'BLOCKED'] })
  verificationStatus!: string;

  @ApiProperty({ nullable: true })
  verificationReason!: string | null;

  @ApiProperty({ format: 'date-time', nullable: true })
  verifiedAt!: string | null;

  @ApiProperty({ format: 'date-time', nullable: true })
  submittedAt!: string | null;

  @ApiProperty({ type: [VerificationHistoryDto] })
  verificationHistory!: VerificationHistoryDto[];
}

export class AdminDocumentDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: ['GOVERNMENT_ID', 'CERTIFICATE', 'WORK_PHOTO'] })
  documentType!: string;

  @ApiProperty({ nullable: true, example: 'aadhaar-front.png' })
  originalFilename!: string | null;

  @ApiProperty({ example: 'image/png', nullable: true })
  mimeType!: string | null;

  @ApiProperty({ example: 245678, description: 'Size in bytes.', nullable: true })
  sizeBytes!: number | null;

  @ApiProperty({ format: 'date-time' })
  uploadedAt!: string;

  @ApiProperty({
    description: 'Short-lived signed URL (5 minutes) from the private storage bucket.',
  })
  signedUrl!: string;
}

export class ListProvidersQueryDto {
  @ApiPropertyOptional({ example: 50, minimum: 1, maximum: 100, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ example: 0, minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;
}
