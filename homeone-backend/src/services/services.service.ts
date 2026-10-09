import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type { SupabaseServiceClient } from '../database/supabase.module';
import { SUPABASE_SERVICE } from '../database/supabase.module';
import type { ServiceRow } from '../database/database.types';
import { assertNoError } from '../database/supabase-error.util';
import type { ServiceResponseDto } from './dto/service.dto';

@Injectable()
export class ServicesService {
  constructor(@Inject(SUPABASE_SERVICE) private readonly client: SupabaseServiceClient) {}

  async findByDomain(domainId: string): Promise<ServiceResponseDto[]> {
    const { data: domain, error: domainError } = await this.client
      .from('service_domains')
      .select('id')
      .eq('id', domainId)
      .maybeSingle();
    assertNoError(domainError);

    if (!domain) {
      throw new BadRequestException(`Service domain "${domainId}" does not exist.`);
    }

    const { data, error } = await this.client
      .from('services')
      .select('*')
      .eq('domain_id', domainId)
      .eq('is_active', true)
      .order('service_name', { ascending: true });
    assertNoError(error);

    return ((data ?? []) as ServiceRow[]).map((row) => ({
      id: row.id,
      domainId: row.domain_id,
      serviceName: row.service_name,
      isActive: row.is_active,
      createdAt: row.created_at,
    }));
  }
}