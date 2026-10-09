import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { SupabaseServiceClient } from '../database/supabase.module';
import { SUPABASE_SERVICE } from '../database/supabase.module';
import type { CustomerHomeRow } from '../database/database.types';
import { assertNoError } from '../database/supabase-error.util';
import type { CreateHomeDto, HomeResponseDto, UpdateHomeDto } from './dto/home.dto';

@Injectable()
export class CustomerService {
  private readonly logger = new Logger(CustomerService.name);

  constructor(@Inject(SUPABASE_SERVICE) private readonly client: SupabaseServiceClient) {}

  async createHome(customerId: string, dto: CreateHomeDto): Promise<HomeResponseDto> {
    this.assertCoordinatePair(dto.latitude, dto.longitude);

    const { count } = await this.client
      .from('customer_homes')
      .select('id', { count: 'exact', head: true })
      .eq('customer_id', customerId);

    // The first address is always the default, whatever the client sent.
    const isDefault = dto.isDefault === true || (count ?? 0) === 0;

    if (isDefault) {
      await this.clearDefault(customerId);
    }

    const { data, error } = await this.client
      .from('customer_homes')
      .insert({
        customer_id: customerId,
        address: dto.address.trim(),
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        label: dto.label?.trim() ?? null,
        is_default: isDefault,
      })
      .select('*')
      .single();
    assertNoError(error);

    return toHomeResponse(data as CustomerHomeRow);
  }

  async listHomes(customerId: string): Promise<HomeResponseDto[]> {
    const { data, error } = await this.client
      .from('customer_homes')
      .select('*')
      .eq('customer_id', customerId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: true });
    assertNoError(error);

    return ((data ?? []) as CustomerHomeRow[]).map(toHomeResponse);
  }

  async updateHome(
    customerId: string,
    homeId: string,
    dto: UpdateHomeDto,
  ): Promise<HomeResponseDto> {
    const home = await this.requireOwnedHome(customerId, homeId);
    this.assertCoordinatePair(
      dto.latitude ?? home.latitude ?? undefined,
      dto.longitude ?? home.longitude ?? undefined,
    );

    const patch: Record<string, unknown> = {};
    if (dto.address !== undefined) patch.address = dto.address.trim();
    if (dto.latitude !== undefined) patch.latitude = dto.latitude;
    if (dto.longitude !== undefined) patch.longitude = dto.longitude;
    if (dto.label !== undefined) patch.label = dto.label?.trim() ?? null;
    if (dto.isDefault !== undefined) patch.is_default = dto.isDefault;

    if (dto.isDefault === true) {
      await this.clearDefault(customerId, homeId);
    }

    const { data, error } = await this.client
      .from('customer_homes')
      .update(patch)
      .eq('id', homeId)
      .select('*')
      .single();
    assertNoError(error);

    this.logger.log(`Home address ${homeId} updated`);
    return toHomeResponse(data as CustomerHomeRow);
  }

  async deleteHome(customerId: string, homeId: string): Promise<{ message: string }> {
    await this.requireOwnedHome(customerId, homeId);

    const { error } = await this.client.from('customer_homes').delete().eq('id', homeId);
    assertNoError(error);

    return { message: 'Home address deleted.' };
  }

  private async requireOwnedHome(customerId: string, homeId: string): Promise<CustomerHomeRow> {
    const { data, error } = await this.client
      .from('customer_homes')
      .select('*')
      .eq('id', homeId)
      .maybeSingle();
    assertNoError(error);

    if (!data) {
      throw new NotFoundException('Home address not found.');
    }

    const home = data as CustomerHomeRow;
    if (home.customer_id !== customerId) {
      throw new ForbiddenException('This home address belongs to another account.');
    }

    return home;
  }

  private async clearDefault(customerId: string, exceptHomeId?: string): Promise<void> {
    let query = this.client
      .from('customer_homes')
      .update({ is_default: false })
      .eq('customer_id', customerId)
      .eq('is_default', true);

    if (exceptHomeId) {
      query = query.neq('id', exceptHomeId);
    }

    const { error } = await query;
    assertNoError(error);
  }

  /** GPS may be unavailable, but a half-filled pair means something went wrong. */
  private assertCoordinatePair(
    latitude: number | undefined,
    longitude: number | undefined,
  ): void {
    if ((latitude === undefined) !== (longitude === undefined)) {
      throw new BadRequestException(
        'Both latitude and longitude must be provided together. Omit both when GPS is unavailable.',
      );
    }
  }
}

function toHomeResponse(row: CustomerHomeRow): HomeResponseDto {
  return {
    id: row.id,
    customerId: row.customer_id,
    address: row.address,
    latitude: row.latitude,
    longitude: row.longitude,
    label: row.label,
    isDefault: row.is_default,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}