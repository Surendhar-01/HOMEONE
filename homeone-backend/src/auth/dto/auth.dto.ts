import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @ApiProperty({
    example: 'customer@example.com',
    description: 'Verified email address or, when SMS auth is configured, a mobile number.',
  })
  @IsString()
  @Matches(/^(\S+@\S+\.\S+|\+?[0-9]{7,15})$/, {
    message: 'Enter a valid email address or mobile number.',
  })
  identifier!: string;

  @ApiProperty({ example: 'StrongPass1', writeOnly: true })
  @IsString()
  @MinLength(1, { message: 'Password is required.' })
  password!: string;

  @ApiPropertyOptional({
    enum: ['CUSTOMER', 'PROFESSIONAL', 'ADMIN'],
    description:
      'When provided, login fails unless the account holds this role. Defaults to CUSTOMER.',
    default: 'CUSTOMER',
  })
  @IsEnum(['CUSTOMER', 'PROFESSIONAL', 'ADMIN'])
  @IsOptional()
  expectedRole?: 'CUSTOMER' | 'PROFESSIONAL' | 'ADMIN';
}

export class VerifyOtpDto {
  @ApiProperty({ example: 'customer@example.com', description: 'Email the OTP was sent to.' })
  @IsEmail({}, { message: 'A valid email address is required.' })
  email!: string;

  @ApiProperty({ example: '123456', description: '6-digit code from the verification message.' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'Enter the 6-digit verification code.' })
  otp!: string;

  @ApiPropertyOptional({ enum: ['signup', 'invite', 'magiclink'], default: 'signup' })
  @IsEnum(['signup', 'invite', 'magiclink'])
  @IsOptional()
  tokenType?: 'signup' | 'invite' | 'magiclink';
}

export class ResendOtpDto {
  @ApiProperty({ example: 'customer@example.com' })
  @IsEmail({}, { message: 'A valid email address is required.' })
  email!: string;

  @ApiPropertyOptional({
    enum: ['signup', 'email_change'],
    default: 'signup',
    description: 'Supabase Auth resend type.',
  })
  @IsEnum(['signup', 'email_change'])
  @IsOptional()
  tokenType?: 'signup' | 'email_change';
}

export class RefreshTokenDto {
  @ApiProperty({ description: 'Refresh token returned by login or verify-otp.' })
  @IsString()
  @MinLength(10, { message: 'A valid refresh token is required.' })
  refreshToken!: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'customer@example.com' })
  @IsEmail({}, { message: 'A valid email address is required.' })
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Recovery token received in the password reset email link.' })
  @IsString()
  @MinLength(10, { message: 'A valid recovery token is required.' })
  recoveryToken!: string;

  @ApiProperty({
    example: 'NewStrongPass1',
    minLength: 8,
    writeOnly: true,
    description:
      'At least 8 characters including an uppercase letter, a lowercase letter and a number.',
  })
  @IsString()
  @MinLength(8, { message: 'Password is required and must be at least 8 characters.' })
  @MaxLength(128)
  password!: string;

  @ApiProperty({ example: 'NewStrongPass1', writeOnly: true })
  @IsString()
  @MinLength(1, { message: 'Confirm password is required.' })
  confirmPassword!: string;
}

export class LogoutDto {
  @ApiPropertyOptional({ description: 'Refresh token to invalidate on the server.' })
  @IsOptional()
  @IsString()
  refreshToken?: string;
}