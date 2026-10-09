import { Inject, Injectable } from '@nestjs/common';
import type { SupabaseServiceClient } from '../database/supabase.module';
import { SUPABASE_SERVICE } from '../database/supabase.module';
import type { ServiceDomainRow } from '../database/database.types';
import { assertNoError } from '../database/supabase-error.util';
import type { ServiceDomainResponseDto } from './dto/service-domain.dto';

@Injectable()
export class ServiceDomainsService {
  constructor(@Inject(SUPABASE_SERVICE) private readonly client: SupabaseServiceClient) {}

  async findAllActive(): Promise<ServiceDomainResponseDto[]> {
    const { data, error } = await this.client
      .from('service_domains')
      .select('*')
      .eq('is_active', true)
      .order('domain_name', { ascending: true });
    assertNoError(error);

    return ((data ?? []) as ServiceDomainRow[]).map((row) => ({
      id: row.id,
      domainName: row.domain_name,
      isActive: row.is_active,
      createdAt: row.created_at,
    }));
  }
}
