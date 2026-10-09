import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { supabaseConfig } from '../config/configuration';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { SupabaseTokenService } from './supabase-token.service';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { SUPABASE_SERVICE, SupabaseServiceClient } from '../database/supabase.module';

type SupabaseConfig = ConfigType<typeof supabaseConfig>;

/**
 * Guards and the token verifier are global so every feature module is
 * authenticated by default; individual routes opt out with `@Public()`.
 */
@Global()
@Module({
  imports: [ConfigModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtAuthGuard,
    RolesGuard,
    {
      provide: SupabaseTokenService,
      inject: [SUPABASE_SERVICE, supabaseConfig.KEY],
      useFactory: (serviceClient: SupabaseServiceClient, config: SupabaseConfig) =>
        new SupabaseTokenService(
          serviceClient,
          `${config.url}/auth/v1`,
          config.jwtSecret,
          'authenticated',
          `${config.url}/auth/v1`,
        ),
    },
  ],
  exports: [AuthService, JwtAuthGuard, RolesGuard, SupabaseTokenService],
})
export class AuthModule {}
