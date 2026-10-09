import { Inject, Injectable, Logger } from '@nestjs/common';
import { createRemoteJWKSet, jwtVerify, type JWTPayload } from 'jose';
import type { SupabaseServiceClient } from '../database/supabase.module';
import { SUPABASE_SERVICE } from '../database/supabase.module';
import type { AuthenticatedUser, UserRole } from '../database/database.types';

/**
 * Validates Supabase access tokens.
 *
 * Supabase signs with HS256 (legacy, symmetric secret) or ES256/RS256
 * (asymmetric JWKS, current default). Both are supported so the backend works
 * regardless of how the project was configured.
 */
@Injectable()
export class SupabaseTokenService {
  private readonly logger = new Logger(SupabaseTokenService.name);
  private remoteJwks: ReturnType<typeof createRemoteJWKSet> | null = null;

  constructor(
    @Inject(SUPABASE_SERVICE) private readonly serviceClient: SupabaseServiceClient,
    private readonly authUrl: string,
    private readonly jwtSecret: string,
    private readonly audience: string,
    private readonly issuer: string,
  ) {}

  async verifyAccessToken(token: string): Promise<JWTPayload> {
    try {
      return await this.verifyWithJwks(token);
    } catch (error) {
      this.logger.debug(
        `JWKS verification unavailable (${(error as Error).message}); trying HS256.`,
      );
      return this.verifyWithSecret(token);
    }
  }

  private async verifyWithJwks(token: string): Promise<JWTPayload> {
    if (!this.remoteJwks) {
      this.remoteJwks = createRemoteJWKSet(
        new URL(`${this.authUrl}/auth/v1/.well-known/jwks.json`),
      );
    }
    const { payload } = await jwtVerify(token, this.remoteJwks, {
      audience: this.audience,
      issuer: this.issuer,
    });
    return payload;
  }

  private async verifyWithSecret(token: string): Promise<JWTPayload> {
    if (!this.jwtSecret) {
      throw new Error(
        'Token signature could not be verified with the configured credentials.',
      );
    }
    const { payload } = await jwtVerify(token, new TextEncoder().encode(this.jwtSecret), {
      audience: this.audience,
      issuer: this.issuer,
    });
    return payload;
  }

  /** Loads roles and profile flags for the subject of a verified token. */
  async buildPrincipal(payload: JWTPayload): Promise<AuthenticatedUser> {
    const userId = payload.sub;
    if (!userId) {
      throw new Error('Token is missing the subject claim.');
    }

    const [{ data: roles }, { data: profile }] = await Promise.all([
      this.serviceClient.from('user_roles').select('role').eq('user_id', userId),
      this.serviceClient
        .from('profiles')
        .select('full_name, is_email_verified, is_mobile_verified')
        .eq('id', userId)
        .maybeSingle(),
    ]);

    const allRoles = ((roles ?? []) as { role: UserRole }[]).map((row) => row.role);

    return {
      id: userId,
      email: (payload.email as string | undefined) ?? null,
      phone: (payload.phone as string | undefined) ?? null,
      role: allRoles[0] ?? null,
      roles: allRoles,
      fullName: profile?.full_name ?? null,
      isEmailVerified: payload.email_verified === true || profile?.is_email_verified === true,
      isMobileVerified: payload.phone_verified === true || profile?.is_mobile_verified === true,
    };
  }
}