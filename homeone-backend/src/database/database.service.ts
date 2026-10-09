import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SUPABASE_CONFIG_NAMESPACE } from '../config/configuration';
import type { SupabaseServiceClient } from './supabase.module';
import { SUPABASE_ANON_CLIENT, SUPABASE_SERVICE } from './supabase.module';

/**
 * Cold PostgREST calls on an idle Supabase project routinely take 2-5s, so the
 * probe budget is generous and the database check is retried once. With a
 * tighter budget the endpoint flaps between ok and degraded under normal use.
 */
const HEALTH_TIMEOUT_MS = 8000;

@Injectable()
export class DatabaseService {
  private readonly logger = new Logger(DatabaseService.name);

  constructor(
    @Inject(SUPABASE_SERVICE) private readonly serviceClient: SupabaseServiceClient,
    @Inject(SUPABASE_ANON_CLIENT) private readonly anonClient: SupabaseServiceClient,
    private readonly config: ConfigService,
  ) {}

  async ping(): Promise<{ database: string; auth: string }> {
    const database = await this.pingDatabase();
    const auth = database === 'up' ? await this.pingAuth() : 'unknown';
    return { database, auth };
  }

  private async pingDatabase(): Promise<'up' | 'down'> {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      const { error } = await this.serviceClient
        .from('service_domains')
        .select('id')
        .limit(1)
        .abortSignal(this.timeoutSignal());

      if (!error) {
        return 'up';
      }

      this.logger.warn(`Database ping attempt ${attempt} failed: ${error.message}`);
    }

    return 'down';
  }

  /**
   * Probes Supabase Auth with the publishable key. `GET /auth/v1/settings` is
   * public and returns the project's Auth configuration, so this confirms both
   * that Auth is reachable and that the key is accepted.
   */
  private async pingAuth(): Promise<'configured' | 'misconfigured' | 'unreachable'> {
    const supabaseUrl = this.config.get<string>(`${SUPABASE_CONFIG_NAMESPACE}.url`) ?? '';
    const publishableKey =
      this.config.get<string>(`${SUPABASE_CONFIG_NAMESPACE}.publishableKey`) ?? '';

    if (!supabaseUrl.startsWith('https://') || !publishableKey) {
      return 'misconfigured';
    }

    try {
      const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
        headers: { apikey: publishableKey, Authorization: `Bearer ${publishableKey}` },
        signal: this.timeoutSignal(),
      });
      return response.ok ? 'configured' : 'unreachable';
    } catch {
      return 'unreachable';
    }
  }

  private timeoutSignal(timeoutMs = HEALTH_TIMEOUT_MS): AbortSignal {
    return AbortSignal.timeout(timeoutMs);
  }

  /** Public build/runtime info. Never includes key material. */
  describeClients() {
    return {
      serviceRoleConfigured: Boolean(
        this.config.get<string>(`${SUPABASE_CONFIG_NAMESPACE}.serviceRoleKey`),
      ),
      publishableKeyConfigured: Boolean(
        this.config.get<string>(`${SUPABASE_CONFIG_NAMESPACE}.publishableKey`),
      ),
      anonClientType: this.anonClient ? 'ready' : 'missing',
    };
  }
}