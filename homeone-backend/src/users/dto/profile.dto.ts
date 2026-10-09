import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import { MOBILE_ERROR_MESSAGE, MOBILE_REGEX } from '../../common/validators/validation.util';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'Ravi Kumar', minLength: 2, maxLength: 120 })
  @IsOptional()
  @IsString()
  @MinLength(2, { message: 'Full name must be at least 2 characters.' })
  @MaxLength(120)
  fullName?: string;

  @ApiPropertyOptional({ example: '+919876543210' })
  @IsOptional()
  @IsString()
  @Matches(MOBILE_REGEX, { message: MOBILE_ERROR_MESSAGE })
  mobileNumber?: string;
}

export class ProfileResponseDto {
  @ApiProperty({ example: '7c1b0f6e-...' })
  id!: string;

  @ApiProperty({ example: 'Ravi Kumar' })
  fullName!: string;

  @ApiProperty({ example: '+919876543210', nullable: true })
  mobileNumber!: string | null;

  @ApiProperty({ example: 'customer@example.com' })
  email!: string;

  @ApiProperty({ example: 'user-id/image/uuid.png', nullable: true })
  profilePhotoPath!: string | null;

  @ApiProperty({
    nullable: true,
    description: 'Short-lived signed URL for the profile photo (15 minutes).',
  })
  profilePhotoUrl!: string | null;

  @ApiProperty({ enum: ['CUSTOMER', 'PROFESSIONAL', 'ADMIN'], nullable: true })
  role!: string | null;

  @ApiProperty()
  isEmailVerified!: boolean;

  @ApiProperty()
  isMobileVerified!: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;

  @ApiProperty({ format: 'date-time' })
  updatedAt!: string;
}