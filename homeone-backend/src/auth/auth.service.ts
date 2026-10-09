import {
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SupabaseServiceClient } from '../database/supabase.module';
import { SUPABASE_ANON_CLIENT, SUPABASE_SERVICE } from '../database/supabase.module';
import type { UserRole } from '../database/database.types';
import { normaliseMobile } from '../common/validators/validation.util';
import type { LoginDto, ResetPasswordDto } from './dto/auth.dto';
import type { RegisterProfileDto } from './dto/register-profile.dto';
import type {
  AuthSessionDto,
  MessageResponseDto,
  RegisterProfileResponseDto,
  ResendOtpResponseDto,
} from './dto/auth-response.dto';

interface AuthUserRecord {
  id: string;
  email?: string;
  phone?: string;
  email_verified?: boolean;
  phone_verified?: boolean;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  /** Cooldown map for OTP resend: email -> epoch millis of last send. */
  private readonly otpCooldown = new Map<string, number>();

  constructor(
    @Inject(SUPABASE_SERVICE) private readonly serviceClient: SupabaseServiceClient,
    @Inject(SUPABASE_ANON_CLIENT) private readonly anonClient: SupabaseServiceClient,
    private readonly config: ConfigService,
  ) {}

  // -------------------------------------------------------------------------
  // Registration
  // -------------------------------------------------------------------------

  /**
   * Creates the auth account through Supabase, then writes `profiles` and
   * `user_roles`. The password goes straight to Supabase Auth and is never
   * stored in Postgres or logged.
   */
  async registerProfile(dto: RegisterProfileDto): Promise<RegisterProfileResponseDto> {
    const role: Exclude<UserRole, 'ADMIN'> = dto.role ?? 'CUSTOMER';
    const email = dto.email.trim().toLowerCase();
    const mobile = normaliseMobile(dto.mobileNumber);

    const emailTaken = await this.serviceClient
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (emailTaken.data) {
      throw new ConflictException('An account with this email address already exists.');
    }

    const mobileTaken = await this.serviceClient
      .from('profiles')
      .select('id')
      .eq('mobile_number', mobile)
      .maybeSingle();

    if (mobileTaken.data) {
      throw new ConflictException('An account with this mobile number already exists.');
    }

    const { data: signUp, error: signUpError } = await this.anonClient.auth.signUp({
      email,
      phone: mobile,
      password: dto.password,
      options: { data: { full_name: dto.fullName } },
    });

    if (signUpError || !signUp.user) {
      throw new ConflictException(
        signUpError?.message ?? 'Registration failed. Please try again.',
      );
    }

    const user = signUp.user as AuthUserRecord;
    const created = await this.persistProfile(user.id, email, mobile, dto.fullName, role);

    if (!created) {
      throw new UnprocessableEntityException(
        'Account was created but the profile could not be saved. Please contact support.',
      );
    }

    // Supabase already sends a confirmation email during signUp. A failed
    // resend is not fatal, but the app needs to know so it can prompt for it.
    const { error: otpError } = await this.anonClient.auth.resend({
      type: 'signup',
      email,
    });

    let otpSent = true;
    if (otpError) {
      this.logger.warn(`OTP dispatch after registration failed: ${otpError.message}`);
      otpSent = false;
    }

    this.markOtpSent(email);

    return {
      userId: user.id,
      email,
      role,
      otpSent,
      otpChannel: this.otpChannel,
      resendAvailableInSeconds: this.cooldownSeconds,
      alreadyRegistered: (signUp.user.identities?.length ?? 0) === 0,
    };
  }

  private async persistProfile(
    userId: string,
    email: string,
    mobile: string,
    fullName: string,
    role: UserRole,
  ): Promise<boolean> {
    const { error: profileError } = await this.serviceClient.from('profiles').insert({
      id: userId,
      full_name: fullName,
      mobile_number: mobile,
      email,
      is_email_verified: false,
      is_mobile_verified: false,
    });

    if (profileError) {
      this.logger.error(`Profile insert failed: ${profileError.message}`);
      return false;
    }

    const { error: roleError } = await this.serviceClient
      .from('user_roles')
      .insert({ user_id: userId, role });

    if (roleError) {
      this.logger.error(`Role insert failed: ${roleError.message}`);
      await this.serviceClient.from('profiles').delete().eq('id', userId);
      return false;
    }

    return true;
  }

  // -------------------------------------------------------------------------
  // OTP
  // -------------------------------------------------------------------------

  async verifyOtp(
    email: string,
    otp: string,
    tokenType: 'signup' | 'invite' | 'magiclink',
  ): Promise<AuthSessionDto> {
    const normalised = email.trim().toLowerCase();

    const { data, error } = await this.anonClient.auth.verifyOtp({
      email: normalised,
      token: otp,
      type: tokenType,
    });

    if (error || !data.user) {
      throw new UnauthorizedException(
        error?.message ?? 'The verification code is invalid or has expired.',
      );
    }

    const user = data.user as AuthUserRecord;
    await this.serviceClient
      .from('profiles')
      .update({ is_email_verified: true, email: normalised })
      .eq('id', user.id);

    return this.buildSession(user, data.session);
  }

  async resendOtp(email: string, tokenType: 'signup' | 'email_change'): Promise<ResendOtpResponseDto> {
    const normalised = email.trim().toLowerCase();
    this.assertOtpCooldown(normalised);

    const { error } = await this.anonClient.auth.resend({
      type: tokenType,
      email: normalised,
    });

    if (error) {
      throw new UnprocessableEntityException(error.message);
    }

    this.markOtpSent(normalised);
    return {
      otpSent: true,
      otpChannel: this.otpChannel,
      resendAvailableInSeconds: this.cooldownSeconds,
    };
  }

  // -------------------------------------------------------------------------
  // Login / refresh / logout
  // -------------------------------------------------------------------------

  async login(dto: LoginDto): Promise<AuthSessionDto> {
    const identifier = dto.identifier.trim();
    const password = dto.password;

    const { data, error } = identifier.includes('@')
      ? await this.anonClient.auth.signInWithPassword({
          email: identifier.toLowerCase(),
          password,
        })
      : await this.anonClient.auth.signInWithPassword({
          phone: normaliseMobile(identifier),
          password,
        });

    if (error || !data.user) {
      throw new UnauthorizedException(error?.message ?? 'Invalid login credentials.');
    }

    const user = data.user as AuthUserRecord;
    const expectedRole = dto.expectedRole ?? 'CUSTOMER';
    const roles = await this.rolesFor(user.id);

    if (!roles.includes(expectedRole)) {
      throw new ForbiddenException(
        `This account is not registered as a ${expectedRole.toLowerCase()}.`,
      );
    }

    await this.syncVerificationFlags(user);
    return this.buildSession(user, data.session);
  }

  async refreshToken(refreshToken: string): Promise<AuthSessionDto> {
    const { data, error } = await this.anonClient.auth.refreshSession({
      refresh_token: refreshToken,
    });

    if (error || !data.user) {
      throw new UnauthorizedException(
        error?.message ?? 'The refresh token is invalid or has expired.',
      );
    }

    return this.buildSession(data.user as AuthUserRecord, data.session);
  }

  async logout(refreshToken?: string): Promise<MessageResponseDto> {
    if (refreshToken) {
      await this.serviceClient.auth.admin.signOut(refreshToken);
    }
    return { message: 'Signed out successfully.' };
  }

  // -------------------------------------------------------------------------
  // Password recovery
  // -------------------------------------------------------------------------

  async forgotPassword(email: string): Promise<MessageResponseDto> {
    const normalised = email.trim().toLowerCase();

    const { error } = await this.anonClient.auth.resetPasswordForEmail(normalised, {
      redirectTo: this.config.get<string>('app.passwordResetRedirectTo'),
    });

    if (error) {
      throw new UnprocessableEntityException(error.message);
    }

    return {
      message:
        'If an account exists for that address, password reset instructions have been sent.',
      emailSent: true,
    };
  }

  async resetPassword(dto: ResetPasswordDto): Promise<MessageResponseDto> {
    const { error: sessionError } = await this.anonClient.auth.verifyOtp({
      token_hash: dto.recoveryToken,
      type: 'recovery',
    });

    if (sessionError) {
      throw new UnauthorizedException(sessionError.message);
    }

    const { error } = await this.anonClient.auth.updateUser({ password: dto.password });
    if (error) {
      throw new UnprocessableEntityException(error.message);
    }

    return { message: 'Password updated successfully. You can now sign in.' };
  }

  // -------------------------------------------------------------------------
  // Internals
  // -------------------------------------------------------------------------

  private get otpChannel(): 'email' | 'sms' {
    return this.config.get<'email' | 'sms'>('auth.otpChannel') ?? 'email';
  }

  private get cooldownSeconds(): number {
    return this.config.get<number>('auth.otpResendCooldownSeconds') ?? 60;
  }

  private markOtpSent(key: string): void {
    this.otpCooldown.set(key, Date.now());
  }

  private assertOtpCooldown(key: string): void {
    const last = this.otpCooldown.get(key);
    if (!last) {
      return;
    }
    const elapsedSeconds = Math.floor((Date.now() - last) / 1000);
    const remaining = this.cooldownSeconds - elapsedSeconds;
    if (remaining > 0) {
      throw new UnprocessableEntityException(
        `Please wait ${remaining} second(s) before requesting another verification code.`,
      );
    }
  }

  private async syncVerificationFlags(user: AuthUserRecord): Promise<void> {
    await this.serviceClient
      .from('profiles')
      .update({
        is_email_verified: user.email_verified ?? false,
        is_mobile_verified: user.phone_verified ?? false,
      })
      .eq('id', user.id);
  }

  private async rolesFor(userId: string): Promise<UserRole[]> {
    const { data } = await this.serviceClient
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    return (data ?? []).map((row) => (row as { role: UserRole }).role);
  }

  private async buildSession(
    user: AuthUserRecord,
    session: {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      token_type?: string;
    } | null,
  ): Promise<AuthSessionDto> {
    if (!session) {
      throw new UnauthorizedException('No session was returned by Supabase Auth.');
    }

    const roles = await this.rolesFor(user.id);
    const { data: profile } = await this.serviceClient
      .from('profiles')
      .select('is_email_verified, is_mobile_verified')
      .eq('id', user.id)
      .maybeSingle();

    return {
      accessToken: session.access_token,
      refreshToken: session.refresh_token,
      expiresIn: session.expires_in ?? 3600,
      tokenType: (session.token_type as 'bearer') ?? 'bearer',
      userId: user.id,
      role: roles[0] ?? null,
      emailVerified: user.email_verified ?? profile?.is_email_verified ?? false,
      mobileVerified: user.phone_verified ?? profile?.is_mobile_verified ?? false,
    };
  }
}