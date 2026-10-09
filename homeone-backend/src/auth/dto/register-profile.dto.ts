import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { Type } from 'class-transformer';
import type { UserRole } from '../../database/database.types';

export class RegisterProfileDto {
  @ApiProperty({ example: 'Ravi Kumar', minLength: 2, maxLength: 120 })
  @IsString()
  @MinLength(2, { message: 'Full name is required.' })
  @MaxLength(120)
  fullName!: string;

  @ApiProperty({ example: '+919876543210', description: '7-15 digits with optional country code' })
  @IsString()
  @Matches(/^\+?[0-9]{7,15}$/, {
    message: 'Enter a valid mobile number (7-15 digits, optional +country code).',
  })
  mobileNumber!: string;

  @ApiProperty({ example: 'ravi@example.com' })
  @IsEmail({}, { message: 'A valid email address is required.' })
  @MaxLength(254)
  email!: string;

  @ApiProperty({
    example: 'StrongPass1',
    minLength: 8,
    description:
      'At least 8 characters including an uppercase letter, a lowercase letter and a number.',
    writeOnly: true,
  })
  @IsString()
  @MinLength(8, {
    message: 'Password is required and must be at least 8 characters.',
  })
  @MaxLength(128)
  password!: string;

  @ApiProperty({ example: 'StrongPass1', writeOnly: true })
  @IsString()
  @MinLength(1, { message: 'Confirm password is required.' })
  confirmPassword!: string;

  @ApiProperty({
    example: true,
    description: 'Must be true. Registration is blocked until terms are accepted.',
  })
  @IsBoolean()
  @Type(() => Boolean)
  agreedToTerms!: boolean;

  @ApiProperty({
    enum: ['CUSTOMER', 'PROFESSIONAL'],
    default: 'CUSTOMER',
    description: 'Requested role. ADMIN cannot be self-assigned.',
  })
  @IsEnum(['CUSTOMER', 'PROFESSIONAL'])
  @IsOptional()
  role?: Exclude<UserRole, 'ADMIN'>;
}
