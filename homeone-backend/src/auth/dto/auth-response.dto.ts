import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AuthSessionDto {
  @ApiProperty({
    description: 'Supabase access token (JWT). Send as `Authorization: Bearer <token>`.',
  })
  accessToken!: string;

  @ApiProperty({ description: 'Refresh token used to obtain a new access token.' })
  refreshToken!: string;

  @ApiProperty({ example: 3600, description: 'Access token lifetime in seconds.' })
  expiresIn!: number;

  @ApiPropertyOptional({ example: 'bearer', enum: ['bearer'] })
  tokenType?: 'bearer';

  @ApiProperty({ description: 'Account id from auth.users.' })
  userId!: string;

  @ApiProperty({ enum: ['CUSTOMER', 'PROFESSIONAL', 'ADMIN'], nullable: true })
  role!: string | null;

  @ApiProperty({ description: 'True when the email address has been confirmed.' })
  emailVerified!: boolean;

  @ApiProperty({ description: 'True when the mobile number has been confirmed.' })
  mobileVerified!: boolean;
}

export class RegisterProfileResponseDto {
  @ApiProperty({ description: 'Account id created in auth.users.' })
  userId!: string;

  @ApiProperty({ example: 'customer@example.com' })
  email!: string;

  @ApiProperty({ enum: ['CUSTOMER', 'PROFESSIONAL'] })
  role!: string;

  @ApiProperty({ description: 'True when an OTP was dispatched to the supplied email.' })
  otpSent!: boolean;

  @ApiProperty({ enum: ['email', 'sms'], description: 'Channel the OTP was delivered on.' })
  otpChannel!: string;

  @ApiPropertyOptional({
    example: 60,
    description: 'Seconds to wait before another OTP can be requested.',
  })
  resendAvailableInSeconds?: number;

  @ApiProperty({ description: 'Set when the email was already registered on this project.' })
  alreadyRegistered?: boolean;
}

export class VerifyOtpResponseDto extends AuthSessionDto {}

export class MessageResponseDto {
  @ApiProperty({ example: 'Password reset instructions have been sent to your email address.' })
  message!: string;

  @ApiPropertyOptional({ example: true })
  emailSent?: boolean;
}

export class ResendOtpResponseDto {
  @ApiProperty({ example: true })
  otpSent!: boolean;

  @ApiProperty({ enum: ['email', 'sms'] })
  otpChannel!: string;

  @ApiProperty({ example: 60 })
  resendAvailableInSeconds!: number;
}

export class LogoutResponseDto {
  @ApiProperty({ example: 'Signed out successfully.' })
  message!: string;
}
