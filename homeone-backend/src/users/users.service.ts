import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { SupabaseServiceClient } from '../database/supabase.module';
import { SUPABASE_SERVICE } from '../database/supabase.module';
import type { ProfileRow } from '../database/database.types';
import { assertNoError } from '../database/supabase-error.util';
import { BUCKETS, StorageService } from '../storage/storage.service';
import {
  MOBILE_ERROR_MESSAGE,
  MOBILE_REGEX,
  normaliseMobile,
} from '../common/validators/validation.util';
import type { ProfileResponseDto, UpdateProfileDto } from './dto/profile.dto';

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(
    @Inject(SUPABASE_SERVICE) private readonly client: SupabaseServiceClient,
    private readonly storage: StorageService,
  ) {}

  async getProfile(userId: string): Promise<ProfileResponseDto> {
    const { data, error } = await this.client
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();
    assertNoError(error);

    if (!data) {
      throw new NotFoundException('Profile not found for this account.');
    }

    const { data: roleRow } = await this.client
      .from('user_roles')
      .select('role')
      .eq('user_id', userId)
      .maybeSingle();

    const profile = data as ProfileRow;
    return {
      id: profile.id,
      fullName: profile.full_name,
      mobileNumber: profile.mobile_number,
      email: profile.email,
      profilePhotoPath: profile.profile_photo_path,
      profilePhotoUrl: profile.profile_photo_path
        ? await this.storage.createSignedUrl(BUCKETS.profilePhotos, profile.profile_photo_path, 900)
        : null,
      role: (roleRow as { role: string } | null)?.role ?? null,
      isEmailVerified: profile.is_email_verified,
      isMobileVerified: profile.is_mobile_verified,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<ProfileResponseDto> {
    const patch: Record<string, unknown> = {};

    if (dto.fullName !== undefined) {
      patch.full_name = dto.fullName.trim();
    }

    if (dto.mobileNumber !== undefined) {
      const mobile = normaliseMobile(dto.mobileNumber);
      if (!MOBILE_REGEX.test(mobile)) {
        throw new BadRequestException(MOBILE_ERROR_MESSAGE);
      }
      const { data: taken } = await this.client
        .from('profiles')
        .select('id')
        .eq('mobile_number', mobile)
        .neq('id', userId)
        .maybeSingle();
      if (taken) {
        throw new BadRequestException('That mobile number belongs to another account.');
      }
      patch.mobile_number = mobile;
    }

    if (Object.keys(patch).length > 0) {
      const { error } = await this.client.from('profiles').update(patch).eq('id', userId);
      assertNoError(error);
    }

    return this.getProfile(userId);
  }

  async uploadProfilePhoto(userId: string, file: Express.Multer.File): Promise<ProfileResponseDto> {
    const uploaded = await this.storage.uploadImage(userId, BUCKETS.profilePhotos, file);

    const { data: current } = await this.client
      .from('profiles')
      .select('profile_photo_path')
      .eq('id', userId)
      .maybeSingle();

    const previousPath = (current as { profile_photo_path: string | null } | null)
      ?.profile_photo_path;
    if (previousPath) {
      await this.storage.remove(BUCKETS.profilePhotos, previousPath);
    }

    const { error } = await this.client
      .from('profiles')
      .update({ profile_photo_path: uploaded.path })
      .eq('id', userId);
    assertNoError(error);

    this.logger.log(`Profile photo updated for user ${userId}`);
    return this.getProfile(userId);
  }

  async removeProfilePhoto(userId: string): Promise<ProfileResponseDto> {
    const { data } = await this.client
      .from('profiles')
      .select('profile_photo_path')
      .eq('id', userId)
      .maybeSingle();

    const path = (data as { profile_photo_path: string | null } | null)?.profile_photo_path;
    if (!path) {
      return this.getProfile(userId);
    }

    const { error } = await this.client
      .from('profiles')
      .update({ profile_photo_path: null })
      .eq('id', userId);
    assertNoError(error);

    await this.storage.remove(BUCKETS.profilePhotos, path);
    return this.getProfile(userId);
  }
}
