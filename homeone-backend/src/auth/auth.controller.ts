import {
  BadRequestException,
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiAcceptedResponse,
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import {
  CONFIRM_PASSWORD_ERROR_MESSAGE,
  passwordsMatch,
  validatePassword,
} from '../common/validators/validation.util';
import { AuthService } from './auth.service';
import {
  ForgotPasswordDto,
  LoginDto,
  LogoutDto,
  RefreshTokenDto,
  ResendOtpDto,
  ResetPasswordDto,
  VerifyOtpDto,
} from './dto/auth.dto';
import { RegisterProfileDto } from './dto/register-profile.dto';
import {
  AuthSessionDto,
  LogoutResponseDto,
  MessageResponseDto,
  RegisterProfileResponseDto,
  ResendOtpResponseDto,
  VerifyOtpResponseDto,
} from './dto/auth-response.dto';
import type { AuthenticatedUser } from '../database/database.types';

const validationErrorSchema = {
  type: 'object',
  properties: {
    statusCode: { type: 'number', example: 400 },
    message: {
      type: 'array',
      items: { type: 'string' },
      example: ['Password is required.'],
    },
    error: { type: 'string', example: 'Bad Request' },
    path: { type: 'string', example: '/api/v1/auth/register-profile' },
    timestamp: { type: 'string', format: 'date-time' },
  },
};

@ApiTags('Authentication')
@Controller('auth')
@UseGuards(JwtAuthGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register-profile')
  @Throttle({ default: { limit: 5, ttl: 600_000 } })
  @ApiOperation({
    summary: 'Register a customer or service provider',
    description:
      'Creates a Supabase Auth account, writes `profiles` and `user_roles`, and dispatches an OTP to the supplied email address. The password is handled entirely by Supabase Auth and is never stored in Postgres.',
  })
  @ApiCreatedResponse({ type: RegisterProfileResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed.', schema: validationErrorSchema })
  @ApiConflictResponse({ description: 'Email or mobile number already registered.' })
  @ApiTooManyRequestsResponse({ description: 'Too many registration attempts. Try again later.' })
  registerProfile(@Body() dto: RegisterProfileDto) {
    this.assertPasswordPolicy(dto.password);
    this.assertPasswordsMatch(dto.password, dto.confirmPassword);
    this.assertTermsAccepted(dto.agreedToTerms);
    return this.authService.registerProfile(dto);
  }

  @Public()
  @Post('verify-otp')
  @Throttle({ default: { limit: 10, ttl: 600_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Verify the OTP and open a session',
    description:
      'Verifies the code through Supabase Auth and returns an access/refresh token pair. Invalid or expired codes return 401.',
  })
  @ApiOkResponse({ type: VerifyOtpResponseDto })
  @ApiBadRequestResponse({ description: 'Malformed OTP.', schema: validationErrorSchema })
  @ApiUnauthorizedResponse({ description: 'Invalid or expired verification code.' })
  verifyOtp(@Body() dto: VerifyOtpDto): Promise<VerifyOtpResponseDto> {
    return this.authService.verifyOtp(dto.email, dto.otp, dto.tokenType ?? 'signup');
  }

  @Public()
  @Post('resend-otp')
  @Throttle({ default: { limit: 5, ttl: 600_000 } })
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Resend the verification OTP',
    description:
      'Enforces a per-email cooldown (default 60 seconds) before dispatching a new code.',
  })
  @ApiAcceptedResponse({ type: ResendOtpResponseDto })
  @ApiTooManyRequestsResponse({ description: 'Resend cooldown has not elapsed.' })
  @ApiUnprocessableEntityResponse({ description: 'Supabase refused to send the code.' })
  resendOtp(@Body() dto: ResendOtpDto): Promise<ResendOtpResponseDto> {
    return this.authService.resendOtp(dto.email, dto.tokenType ?? 'signup');
  }

  @Public()
  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 300_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Sign in with email or mobile number',
    description:
      'Authenticates against Supabase Auth and verifies the account holds the expected role (CUSTOMER by default, or PROFESSIONAL / ADMIN for those logins).',
  })
  @ApiOkResponse({ type: AuthSessionDto })
  @ApiUnauthorizedResponse({ description: 'Invalid login credentials.' })
  @ApiForbiddenResponse({ description: 'Account does not hold the expected role.' })
  login(@Body() dto: LoginDto): Promise<AuthSessionDto> {
    return this.authService.login(dto);
  }

  @Public()
  @Post('refresh-token')
  @Throttle({ default: { limit: 30, ttl: 300_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange a refresh token for a new session' })
  @ApiOkResponse({ type: AuthSessionDto })
  @ApiUnauthorizedResponse({ description: 'Refresh token is invalid or expired.' })
  refreshToken(@Body() dto: RefreshTokenDto): Promise<AuthSessionDto> {
    return this.authService.refreshToken(dto.refreshToken);
  }

  @Public()
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Sign out and invalidate the refresh token' })
  @ApiOkResponse({ type: LogoutResponseDto })
  logout(@Body() dto: LogoutDto): Promise<LogoutResponseDto> {
    return this.authService.logout(dto.refreshToken);
  }

  @Public()
  @Post('forgot-password')
  @Throttle({ default: { limit: 5, ttl: 900_000 } })
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Request a password reset email',
    description:
      'Always returns the same message so the endpoint cannot be used to enumerate registered accounts.',
  })
  @ApiAcceptedResponse({ type: MessageResponseDto })
  forgotPassword(@Body() dto: ForgotPasswordDto): Promise<MessageResponseDto> {
    return this.authService.forgotPassword(dto.email);
  }

  @Public()
  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 900_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Set a new password using the recovery token',
    description: 'The recovery token is the `token_hash` extracted from the password reset link.',
  })
  @ApiOkResponse({ type: MessageResponseDto })
  @ApiUnauthorizedResponse({ description: 'Recovery token is invalid or expired.' })
  @ApiBadRequestResponse({ description: 'Validation failed.', schema: validationErrorSchema })
  resetPassword(@Body() dto: ResetPasswordDto): Promise<MessageResponseDto> {
    this.assertPasswordPolicy(dto.password);
    this.assertPasswordsMatch(dto.password, dto.confirmPassword);
    return this.authService.resetPassword(dto);
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Return the authenticated principal (roles, verification flags)' })
  @ApiOkResponse({ description: 'The authenticated user.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  me(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }

  // ---------------------------------------------------------------------------

  private assertPasswordPolicy(password: string): void {
    const error = validatePassword(password);
    if (error) {
      throw new BadRequestException([error]);
    }
  }

  private assertPasswordsMatch(password: string, confirmPassword: string): void {
    if (!passwordsMatch(password, confirmPassword)) {
      throw new BadRequestException([CONFIRM_PASSWORD_ERROR_MESSAGE]);
    }
  }

  private assertTermsAccepted(accepted: boolean): void {
    if (accepted !== true) {
      throw new BadRequestException([
        'You must accept the Terms and Conditions before registering.',
      ]);
    }
  }
}
