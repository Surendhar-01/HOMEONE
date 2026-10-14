import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { supabaseConfig } from '../config/configuration';

export type SupabaseConfigType = ReturnType<typeof supabaseConfig>;

export const SUPABASE_SERVICE = 'SUPABASE_SERVICE';
export const SUPABASE_ANON_CLIENT = 'SUPABASE_ANON_CLIENT';

export type SupabaseServiceClient = SupabaseClient;

/**
 * Owns the two Supabase clients used by the backend.
 *
 * - `SUPABASE_SERVICE` uses the service role key and bypasses RLS. It is the
 *   only client allowed to read private buckets, approve providers, or write
 *   to tables the publishable key cannot touch. Never return it from an endpoint.
 * - `SUPABASE_ANON_CLIENT` uses the publishable key and mirrors the trust level
 *   of the mobile app, used for Auth sign-up / sign-in / OTP flows.
 */
@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: SUPABASE_SERVICE,
      inject: [supabaseConfig.KEY],
      useFactory: (config: SupabaseConfigType) =>
        createClient(config.url, config.serviceRoleKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        }),
    },
    {
      provide: SUPABASE_ANON_CLIENT,
      inject: [supabaseConfig.KEY],
      useFactory: (config: SupabaseConfigType) =>
        createClient(config.url, config.publishableKey, {
          auth: { persistSession: false, autoRefreshToken: false },
        }),
    },
  ],
  exports: [SUPABASE_SERVICE, SUPABASE_ANON_CLIENT],
})
export class SupabaseModule {}
