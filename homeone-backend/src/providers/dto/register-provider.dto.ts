import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ValidWorkingHours } from '../validators/working-hours.validator';
import { MOBILE_REGEX, MOBILE_ERROR_MESSAGE } from '../../common/validators/validation.util';
import type { DocumentType, VerificationStatus } from '../../database/database.types';

const TIME_REGEX = /^([01]\d|2[0-3]):([0-5]\d)$/;

export class WorkingHourDto {
  @ApiProperty({ example: 1, minimum: 0, maximum: 6, description: '0 = Sunday ... 6 = Saturday' })
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'dayOfWeek must be between 0 (Sunday) and 6 (Saturday).' })
  @Max(6)
  dayOfWeek!: number;

  @ApiProperty({ example: '09:00', description: '24-hour HH:mm.' })
  @Matches(TIME_REGEX, { message: 'startTime must be in HH:mm 24-hour format.' })
  startTime!: string;

  @ApiProperty({ example: '18:00', description: 'Must be later than startTime.' })
  @Matches(TIME_REGEX, { message: 'endTime must be in HH:mm 24-hour format.' })
  endTime!: string;
}

export class RegisterProviderDto {
  @ApiProperty({ example: 'Ravi Kumar', minLength: 2, maxLength: 120 })
  @IsString()
  @MinLength(2, { message: 'Full name is required.' })
  @MaxLength(120)
  fullName!: string;

  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @Matches(MOBILE_REGEX, { message: MOBILE_ERROR_MESSAGE })
  mobileNumber!: string;

  @ApiProperty({ example: 'ravi@example.com' })
  @IsString()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ minLength: 8, writeOnly: true })
  @IsString()
  @MinLength(8, { message: 'Password is required and must be at least 8 characters.' })
  @MaxLength(128)
  password!: string;

  @ApiProperty({ writeOnly: true })
  @IsString()
  @MinLength(1, { message: 'Confirm password is required.' })
  confirmPassword!: string;

  @ApiProperty({ example: 'Cleaning Services', description: 'Service domain name.' })
  @IsString()
  @MinLength(2, { message: 'Service domain is required.' })
  domainName!: string;

  @ApiProperty({ type: [String], example: ['Deep Cleaning', 'Kitchen Cleaning'] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Select at least one skill or service.' })
  @IsString({ each: true })
  skills!: string[];

  @ApiProperty({ example: 6, minimum: 0, maximum: 70 })
  @Type(() => Number)
  @IsInt({ message: 'Years of experience must be a whole number.' })
  @Min(0, { message: 'Years of experience cannot be negative.' })
  @Max(70)
  yearsOfExperience!: number;

  @ApiProperty({ type: [String], example: ['Tamil', 'English'] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Select at least one language.' })
  @IsString({ each: true })
  languagesSpoken!: string[];

  @ApiProperty({ example: '12 MG Road, Bengaluru, Karnataka 560001' })
  @IsString()
  @MinLength(5, { message: 'Business address is required.' })
  @MaxLength(500)
  businessAddress!: string;

  @ApiPropertyOptional({ example: 12.9716, description: 'Live GPS latitude from the device.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-90)
  @Max(90)
  latitude?: number;

  @ApiPropertyOptional({ example: 77.5946, description: 'Live GPS longitude from the device.' })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(-180)
  @Max(180)
  longitude?: number;

  @ApiPropertyOptional({
    type: [WorkingHourDto],
    description: 'Working days and times. Defaults to Mon-Sat 09:00-18:00 when omitted.',
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkingHourDto)
  @ValidWorkingHours()
  workingHours?: WorkingHourDto[];

  @ApiPropertyOptional({
    example: true,
    description:
      'False when the professional has no certificate. The application is still submitted for manual review.',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  hasCertificate?: boolean;

  @ApiPropertyOptional({
    example: true,
    description: 'Must be true. Providers accept the platform terms on submission.',
  })
  @Type(() => Boolean)
  @IsBoolean()
  agreedToTerms!: boolean;
}

export class UpdateProviderDto {
  @ApiPropertyOptional({ example: '12 MG Road, Bengaluru' })
  @IsOptional()
  @IsString()
  @MinLength(5)
  @MaxLength(500)
  businessAddress?: string;

  @ApiPropertyOptional({ example: 12.9716 })
  @IsOptional()
  @Type(() => Number)
  latitude?: number;

  @ApiPropertyOptional({ example: 77.5946 })
  @IsOptional()
  @Type(() => Number)
  longitude?: number;

  @ApiPropertyOptional({ example: 8, minimum: 0, maximum: 70 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0, { message: 'Years of experience cannot be negative.' })
  @Max(70)
  yearsOfExperience?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  languagesSpoken?: string[];

  @ApiPropertyOptional({ type: [String], description: 'Service domain name.' })
  @IsOptional()
  @IsString()
  domainName?: string;
}

export class UpdateSkillsDto {
  @ApiProperty({ type: [String], example: ['Deep Cleaning', 'Sofa Cleaning'] })
  @IsArray()
  @ArrayMinSize(1, { message: 'Select at least one skill or service.' })
  @IsString({ each: true })
  skills!: string[];
}

export class UpdateWorkingHoursDto {
  @ApiProperty({ type: [WorkingHourDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkingHourDto)
  @ValidWorkingHours()
  workingHours!: WorkingHourDto[];
}

export class UploadProviderDocumentDto {
  @ApiProperty({
    enum: ['GOVERNMENT_ID', 'CERTIFICATE'],
    description: 'Work photos use POST /providers/work-photos instead.',
  })
  @Type(() => String)
  @IsIn(['GOVERNMENT_ID', 'CERTIFICATE'], {
    message: 'documentType must be GOVERNMENT_ID or CERTIFICATE.',
  })
  documentType!: Extract<DocumentType, 'GOVERNMENT_ID' | 'CERTIFICATE'>;

  @ApiPropertyOptional({
    example: false,
    description: 'Set true when the provider explicitly has no certificate.',
  })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  noCertificate?: boolean;
}

export class VerificationStatusResponseDto {
  @ApiProperty({ enum: ['PENDING', 'APPROVED', 'REJECTED', 'BLOCKED'] })
  verificationStatus!: VerificationStatus;

  @ApiProperty({ nullable: true, description: 'Admin reason for a REJECTED or BLOCKED status.' })
  verificationReason!: string | null;

  @ApiProperty({ nullable: true })
  verifiedAt!: string | null;

  @ApiProperty({ example: 'Pending Verification' })
  title!: string;

  @ApiProperty({
    example:
      'Your registration has been submitted successfully. Your documents are under verification. Please wait for admin approval.',
  })
  message!: string;

  @ApiProperty({
    description: 'True when the account may open the service provider dashboard.',
  })
  canAccessDashboard!: boolean;
}
