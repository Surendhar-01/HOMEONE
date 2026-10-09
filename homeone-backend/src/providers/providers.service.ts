import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SupabaseServiceClient } from '../database/supabase.module';
import { SUPABASE_ANON_CLIENT, SUPABASE_SERVICE } from '../database/supabase.module';
import type {
  DocumentType,
  ProviderDocumentRow,
  ProviderSkillRow,
  ProviderWorkingHourRow,
  ServiceProviderRow,
  VerificationStatus,
} from '../database/database.types';
import { assertNoError } from '../database/supabase-error.util';
import {
  CONFIRM_PASSWORD_ERROR_MESSAGE,
  passwordsMatch,
  validatePassword,
} from '../common/validators/validation.util';
import { VERIFICATION_MESSAGES } from '../common/constants/verification-messages';
import { StorageService, BUCKETS } from '../storage/storage.service';
import type {
  RegisterProviderDto,
  UpdateProviderDto,
  UpdateSkillsDto,
  UpdateWorkingHoursDto,
  VerificationStatusResponseDto,
  WorkingHourDto,
} from './dto/register-provider.dto';

export interface ProviderProfileView {
  id: string;
  userId: string;
  domainId: string;
  domainName: string | null;
  yearsOfExperience: number;
  languagesSpoken: string[];
  businessAddress: string;
  latitude: number | null;
  longitude: number | null;
  hasCertificate: boolean;
  verificationStatus: VerificationStatus;
  verificationReason: string | null;
  verifiedAt: string | null;
  submittedAt: string | null;
  skills: { id: string; serviceId: string; serviceName: string }[];
  workingHours: ProviderWorkingHourRow[];
  documents: ProviderDocumentRow[];
  documentsComplete: boolean;
  canAccessDashboard: boolean;
}

@Injectable()
export class ProvidersService {
  private readonly logger = new Logger(ProvidersService.name);

  constructor(
    @Inject(SUPABASE_SERVICE) private readonly serviceClient: SupabaseServiceClient,
    @Inject(SUPABASE_ANON_CLIENT) private readonly anonClient: SupabaseServiceClient,
    private readonly storage: StorageService,
    private readonly config: ConfigService,
  ) {}

  // -------------------------------------------------------------------------
  // Registration
  // -------------------------------------------------------------------------

  /**
   * Professional registration. Creates the auth account, the profile, the
   * provider row (always PENDING), skills, and working hours. Document upload
   * happens afterwards through /providers/documents and /providers/work-photos.
   */
  async registerProvider(dto: RegisterProviderDto): Promise<{
    userId: string;
    email: string;
    role: 'PROFESSIONAL';
    verificationStatus: VerificationStatus;
    otpSent: boolean;
    otpChannel: string;
    resendAvailableInSeconds: number;
    providerId: string;
  }> {
    const passwordError = validatePassword(dto.password);
    if (passwordError) {
      throw new BadRequestException([passwordError]);
    }
    if (!passwordsMatch(dto.password, dto.confirmPassword)) {
      throw new BadRequestException([CONFIRM_PASSWORD_ERROR_MESSAGE]);
    }
    if (dto.agreedToTerms !== true) {
      throw new BadRequestException([
        'You must accept the Terms and Conditions before submitting.',
      ]);
    }

    const email = dto.email.trim().toLowerCase();
    const mobile = dto.mobileNumber.replace(/[\s()-]/g, '');

    const { data: emailTaken } = await this.serviceClient
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();
    if (emailTaken) {
      throw new BadRequestException('An account with this email address already exists.');
    }

    const { data: mobileTaken } = await this.serviceClient
      .from('profiles')
      .select('id')
      .eq('mobile_number', mobile)
      .maybeSingle();
    if (mobileTaken) {
      throw new BadRequestException('An account with this mobile number already exists.');
    }

    const domain = await this.resolveDomain(dto.domainName);
    const services = await this.resolveServices(domain.id, dto.skills);

    const { data: signUp, error: signUpError } = await this.anonClient.auth.signUp({
      email,
      phone: mobile,
      password: dto.password,
      options: { data: { full_name: dto.fullName, role: 'PROFESSIONAL' } },
    });

    if (signUpError || !signUp.user) {
      throw new BadRequestException(
        signUpError?.message ?? 'Registration failed. Please try again.',
      );
    }

    const userId = signUp.user.id;

    const { error: profileError } = await this.serviceClient.from('profiles').insert({
      id: userId,
      full_name: dto.fullName,
      mobile_number: mobile,
      email,
      is_email_verified: false,
      is_mobile_verified: false,
    });
    assertNoError(profileError);

    const { error: roleError } = await this.serviceClient
      .from('user_roles')
      .insert({ user_id: userId, role: 'PROFESSIONAL' });
    assertNoError(roleError);

    const { data: provider, error: providerError } = await this.serviceClient
      .from('service_providers')
      .insert({
        user_id: userId,
        domain_id: domain.id,
        years_of_experience: dto.yearsOfExperience,
        languages_spoken: dto.languagesSpoken,
        business_address: dto.businessAddress,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        has_certificate: dto.hasCertificate ?? true,
        verification_status: 'PENDING',
        submitted_at: new Date().toISOString(),
      })
      .select('id')
      .single();
    assertNoError(providerError);

    await this.replaceSkills(
      provider!.id,
      services.map((s) => s.id),
    );
    await this.replaceWorkingHours(provider!.id, dto.workingHours ?? defaultWorkingHours());

    const channel = this.config.get<'email' | 'sms'>('auth.otpChannel') ?? 'email';
    let otpSent = true;
    const { error: otpError } = await this.anonClient.auth.resend({ type: 'signup', email });
    if (otpError) {
      this.logger.warn(`Provider OTP dispatch failed: ${otpError.message}`);
      otpSent = false;
    }

    await this.serviceClient.from('notifications').insert({
      user_id: userId,
      title: VERIFICATION_MESSAGES.PENDING.title,
      message: VERIFICATION_MESSAGES.PENDING.message,
      notification_type: 'VERIFICATION_STATUS',
    });

    return {
      userId,
      email,
      role: 'PROFESSIONAL',
      verificationStatus: 'PENDING',
      otpSent,
      otpChannel: channel,
      resendAvailableInSeconds: this.config.get<number>('auth.otpResendCooldownSeconds') ?? 60,
      providerId: provider!.id,
    };
  }

  // -------------------------------------------------------------------------
  // Reads
  // -------------------------------------------------------------------------

  async getMyProvider(userId: string): Promise<ProviderProfileView> {
    const provider = await this.providerByUserId(userId);
    if (!provider) {
      throw new NotFoundException(
        'No service provider profile exists for this account. Complete registration first.',
      );
    }
    return this.buildView(provider);
  }

  async getProviderById(providerId: string): Promise<ProviderProfileView> {
    const { data, error } = await this.serviceClient
      .from('service_providers')
      .select('*')
      .eq('id', providerId)
      .maybeSingle();
    assertNoError(error);

    if (!data) {
      throw new NotFoundException('Service provider not found.');
    }
    return this.buildView(data as ServiceProviderRow);
  }

  async listDocuments(
    providerId: string,
    includeUrls = true,
  ): Promise<(ProviderDocumentRow & { signedUrl?: string })[]> {
    const { data, error } = await this.serviceClient
      .from('provider_documents')
      .select('*')
      .eq('provider_id', providerId)
      .order('uploaded_at', { ascending: false });
    assertNoError(error);

    const rows = (data ?? []) as ProviderDocumentRow[];
    if (!includeUrls) {
      return rows;
    }

    return Promise.all(
      rows.map(async (row) => {
        const bucket =
          row.document_type === 'WORK_PHOTO'
            ? BUCKETS.providerWorkPhotos
            : BUCKETS.providerDocuments;
        try {
          const signedUrl = await this.storage.createSignedUrl(bucket, row.storage_path, 300);
          return { ...row, signedUrl };
        } catch {
          this.logger.warn(`Signed URL unavailable for document ${row.id}`);
          return row;
        }
      }),
    );
  }

  async getVerificationStatus(userId: string): Promise<VerificationStatusResponseDto> {
    const provider = await this.providerByUserId(userId);
    if (!provider) {
      throw new NotFoundException('No service provider profile exists for this account.');
    }
    return this.verificationStatusDto(provider);
  }

  verificationStatusDto(provider: ServiceProviderRow): VerificationStatusResponseDto {
    const copy = VERIFICATION_MESSAGES[provider.verification_status];
    return {
      verificationStatus: provider.verification_status,
      verificationReason: provider.verification_reason,
      verifiedAt: provider.verified_at,
      title: copy.title,
      message: copy.message,
      canAccessDashboard: provider.verification_status === 'APPROVED',
    };
  }

  // -------------------------------------------------------------------------
  // Updates
  // -------------------------------------------------------------------------

  async updateProvider(userId: string, dto: UpdateProviderDto): Promise<ProviderProfileView> {
    const provider = await this.requireProvider(userId);
    const patch: Record<string, unknown> = {};

    if (dto.businessAddress !== undefined) {
      patch.business_address = dto.businessAddress;
    }
    if (dto.latitude !== undefined) {
      patch.latitude = dto.latitude;
    }
    if (dto.longitude !== undefined) {
      patch.longitude = dto.longitude;
    }
    if (dto.yearsOfExperience !== undefined) {
      patch.years_of_experience = dto.yearsOfExperience;
    }
    if (dto.languagesSpoken !== undefined) {
      patch.languages_spoken = dto.languagesSpoken;
    }
    if (dto.domainName !== undefined) {
      const domain = await this.resolveDomain(dto.domainName);
      patch.domain_id = domain.id;
    }

    if (Object.keys(patch).length > 0) {
      // A rejected or blocked provider editing their details returns to review.
      if (provider.verification_status !== 'PENDING') {
        patch.verification_status = 'PENDING';
        patch.verification_reason = null;
        patch.verified_at = null;
      }
      const { error } = await this.serviceClient
        .from('service_providers')
        .update(patch)
        .eq('id', provider.id);
      assertNoError(error);
    }

    return this.getMyProvider(userId);
  }

  async updateSkills(userId: string, dto: UpdateSkillsDto): Promise<ProviderProfileView> {
    const provider = await this.requireProvider(userId);
    const services = await this.resolveServices(provider.domain_id, dto.skills);
    await this.replaceSkills(
      provider.id,
      services.map((s) => s.id),
    );
    return this.getMyProvider(userId);
  }

  async updateWorkingHours(
    userId: string,
    dto: UpdateWorkingHoursDto,
  ): Promise<ProviderProfileView> {
    const provider = await this.requireProvider(userId);
    await this.replaceWorkingHours(provider.id, dto.workingHours);
    return this.getMyProvider(userId);
  }

  // -------------------------------------------------------------------------
  // Documents
  // -------------------------------------------------------------------------

  async attachDocument(
    userId: string,
    documentType: Extract<DocumentType, 'GOVERNMENT_ID' | 'CERTIFICATE'>,
    file: Express.Multer.File | null,
    noCertificate: boolean,
  ): Promise<ProviderProfileView> {
    const provider = await this.requireProvider(userId);

    if (documentType === 'CERTIFICATE' && noCertificate && file) {
      throw new BadRequestException(
        'Upload a certificate file or set noCertificate=true, not both.',
      );
    }

    if (documentType === 'GOVERNMENT_ID' && !file) {
      throw new BadRequestException('A government ID document must be uploaded.');
    }

    if (documentType === 'CERTIFICATE' && !noCertificate && !file) {
      throw new BadRequestException('Upload a certificate file or declare that none is available.');
    }

    if (noCertificate) {
      await this.replaceDocumentsOfType(provider.id, 'CERTIFICATE');
      const { error } = await this.serviceClient
        .from('service_providers')
        .update({ has_certificate: false })
        .eq('id', provider.id);
      assertNoError(error);
      return this.getMyProvider(userId);
    }

    const uploaded = await this.storage.uploadDocument(userId, BUCKETS.providerDocuments, file!);

    await this.replaceDocumentsOfType(provider.id, documentType);
    const { error } = await this.serviceClient.from('provider_documents').insert({
      provider_id: provider.id,
      document_type: documentType,
      storage_path: uploaded.path,
      original_filename: file!.originalname,
      mime_type: uploaded.mimeType,
      size_bytes: uploaded.size,
    });
    assertNoError(error);

    if (documentType === 'CERTIFICATE') {
      await this.serviceClient
        .from('service_providers')
        .update({ has_certificate: true })
        .eq('id', provider.id);
    }

    await this.touchSubmitted(provider.id);
    return this.getMyProvider(userId);
  }

  async attachWorkPhotos(
    userId: string,
    files: Express.Multer.File[],
  ): Promise<ProviderProfileView> {
    const provider = await this.requireProvider(userId);

    const rows: {
      provider_id: string;
      document_type: DocumentType;
      storage_path: string;
      original_filename: string;
      mime_type: string;
      size_bytes: number;
    }[] = [];

    for (const file of files) {
      const uploaded = await this.storage.uploadImage(userId, BUCKETS.providerWorkPhotos, file);
      rows.push({
        provider_id: provider.id,
        document_type: 'WORK_PHOTO',
        storage_path: uploaded.path,
        original_filename: file.originalname,
        mime_type: uploaded.mimeType,
        size_bytes: uploaded.size,
      });
    }

    const { error } = await this.serviceClient.from('provider_documents').insert(rows);
    assertNoError(error);

    await this.touchSubmitted(provider.id);
    return this.getMyProvider(userId);
  }

  /** Readiness flag used by the app to decide whether to show the admin-review note. */
  async documentsComplete(providerId: string): Promise<boolean> {
    const { data, error } = await this.serviceClient
      .from('provider_documents')
      .select('document_type')
      .eq('provider_id', providerId);
    assertNoError(error);

    const types = new Set(
      (data ?? []).map((row) => (row as { document_type: DocumentType }).document_type),
    );
    return types.has('GOVERNMENT_ID') && types.has('WORK_PHOTO');
  }

  // -------------------------------------------------------------------------
  // Helpers
  // -------------------------------------------------------------------------

  async providerByUserId(userId: string): Promise<ServiceProviderRow | null> {
    const { data, error } = await this.serviceClient
      .from('service_providers')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();
    assertNoError(error);
    return (data as ServiceProviderRow | null) ?? null;
  }

  async requireProvider(userId: string): Promise<ServiceProviderRow> {
    const provider = await this.providerByUserId(userId);
    if (!provider) {
      throw new NotFoundException('No service provider profile exists for this account.');
    }
    return provider;
  }

  async requireApprovedProvider(userId: string): Promise<ServiceProviderRow> {
    const provider = await this.requireProvider(userId);
    if (provider.verification_status !== 'APPROVED') {
      throw new BadRequestException(
        `This feature is available only after approval. Current status: ${provider.verification_status}.`,
      );
    }
    return provider;
  }

  private async buildView(provider: ServiceProviderRow): Promise<ProviderProfileView> {
    const [{ data: domain }, { data: skills }, { data: hours }, { data: documents }] =
      await Promise.all([
        this.serviceClient
          .from('service_domains')
          .select('domain_name')
          .eq('id', provider.domain_id)
          .maybeSingle(),
        this.serviceClient
          .from('provider_skills')
          .select('id, service_id')
          .eq('provider_id', provider.id),
        this.serviceClient
          .from('provider_working_hours')
          .select('*')
          .eq('provider_id', provider.id)
          .order('day_of_week'),
        this.serviceClient.from('provider_documents').select('*').eq('provider_id', provider.id),
      ]);

    const serviceIds = ((skills ?? []) as ProviderSkillRow[]).map((row) => row.service_id);
    const { data: serviceRows } = serviceIds.length
      ? await this.serviceClient.from('services').select('id, service_name').in('id', serviceIds)
      : { data: [] as { id: string; service_name: string }[] };

    const nameById = new Map(
      ((serviceRows ?? []) as { id: string; service_name: string }[]).map((row) => [
        row.id,
        row.service_name,
      ]),
    );

    const documentRows = (documents ?? []) as ProviderDocumentRow[];

    return {
      id: provider.id,
      userId: provider.user_id,
      domainId: provider.domain_id,
      domainName: (domain as { domain_name: string } | null)?.domain_name ?? null,
      yearsOfExperience: provider.years_of_experience,
      languagesSpoken: provider.languages_spoken ?? [],
      businessAddress: provider.business_address,
      latitude: provider.latitude,
      longitude: provider.longitude,
      hasCertificate: provider.has_certificate,
      verificationStatus: provider.verification_status,
      verificationReason: provider.verification_reason,
      verifiedAt: provider.verified_at,
      submittedAt: provider.submitted_at,
      skills: ((skills ?? []) as ProviderSkillRow[]).map((row) => ({
        id: row.id,
        serviceId: row.service_id,
        serviceName: nameById.get(row.service_id) ?? 'Unknown service',
      })),
      workingHours: (hours ?? []) as ProviderWorkingHourRow[],
      documents: documentRows,
      documentsComplete:
        documentRows.some((row) => row.document_type === 'GOVERNMENT_ID') &&
        documentRows.some((row) => row.document_type === 'WORK_PHOTO'),
      canAccessDashboard: provider.verification_status === 'APPROVED',
    };
  }

  private async resolveDomain(domainName: string): Promise<{ id: string; domain_name: string }> {
    const { data, error } = await this.serviceClient
      .from('service_domains')
      .select('id, domain_name')
      .eq('domain_name', domainName.trim())
      .eq('is_active', true)
      .maybeSingle();
    assertNoError(error);

    if (!data) {
      throw new BadRequestException(`"${domainName}" is not an available service domain.`);
    }
    return data as { id: string; domain_name: string };
  }

  private async resolveServices(
    domainId: string,
    names: string[],
  ): Promise<{ id: string; service_name: string }[]> {
    const { data, error } = await this.serviceClient
      .from('services')
      .select('id, service_name')
      .eq('domain_id', domainId)
      .eq('is_active', true);
    assertNoError(error);

    const available = (data ?? []) as { id: string; service_name: string }[];
    const byName = new Map(available.map((row) => [row.service_name.toLowerCase(), row]));

    const resolved: { id: string; service_name: string }[] = [];
    const missing: string[] = [];
    for (const name of names) {
      const match = byName.get(name.trim().toLowerCase());
      if (match) {
        resolved.push(match);
      } else {
        missing.push(name);
      }
    }

    if (missing.length) {
      throw new BadRequestException(
        `These skills are not available for the selected domain: ${missing.join(', ')}.`,
      );
    }

    return resolved;
  }

  private async replaceSkills(providerId: string, serviceIds: string[]): Promise<void> {
    const { error: deleteError } = await this.serviceClient
      .from('provider_skills')
      .delete()
      .eq('provider_id', providerId);
    assertNoError(deleteError);

    if (serviceIds.length === 0) {
      return;
    }

    const { error } = await this.serviceClient
      .from('provider_skills')
      .insert(serviceIds.map((serviceId) => ({ provider_id: providerId, service_id: serviceId })));
    assertNoError(error);
  }

  private async replaceWorkingHours(providerId: string, hours: WorkingHourDto[]): Promise<void> {
    validateWorkingHours(hours);

    const { error: deleteError } = await this.serviceClient
      .from('provider_working_hours')
      .delete()
      .eq('provider_id', providerId);
    assertNoError(deleteError);

    const rows = hours.map((hour) => ({
      provider_id: providerId,
      day_of_week: hour.dayOfWeek,
      start_time: hour.startTime,
      end_time: hour.endTime,
    }));

    const { error } = await this.serviceClient.from('provider_working_hours').insert(rows);
    assertNoError(error);
  }

  /** Deletes the previous files of a type so a re-upload never orphans storage. */
  private async replaceDocumentsOfType(
    providerId: string,
    documentType: DocumentType,
  ): Promise<void> {
    const { data: existing } = await this.serviceClient
      .from('provider_documents')
      .select('id, storage_path')
      .eq('provider_id', providerId)
      .eq('document_type', documentType);

    const rows = (existing ?? []) as { id: string; storage_path: string }[];
    if (!rows.length) {
      return;
    }

    const bucket =
      documentType === 'WORK_PHOTO' ? BUCKETS.providerWorkPhotos : BUCKETS.providerDocuments;

    for (const row of rows) {
      await this.storage.remove(bucket, row.storage_path);
    }

    const { error } = await this.serviceClient
      .from('provider_documents')
      .delete()
      .eq('provider_id', providerId)
      .eq('document_type', documentType);
    assertNoError(error);
  }

  private async touchSubmitted(providerId: string): Promise<void> {
    await this.serviceClient
      .from('service_providers')
      .update({ submitted_at: new Date().toISOString() })
      .eq('id', providerId);
  }
}

export function validateWorkingHours(hours: WorkingHourDto[]): void {
  if (hours.length === 0) {
    throw new BadRequestException('At least one working day must be provided.');
  }

  const seen = new Set<number>();
  for (const hour of hours) {
    if (hour.startTime >= hour.endTime) {
      throw new BadRequestException(
        `End time (${hour.endTime}) must be later than start time (${hour.startTime}) for day ${hour.dayOfWeek}.`,
      );
    }
    if (seen.has(hour.dayOfWeek)) {
      throw new BadRequestException(`Day ${hour.dayOfWeek} is listed more than once.`);
    }
    seen.add(hour.dayOfWeek);
  }
}

export function defaultWorkingHours(): WorkingHourDto[] {
  return [1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
    dayOfWeek,
    startTime: '09:00',
    endTime: '18:00',
  }));
}
