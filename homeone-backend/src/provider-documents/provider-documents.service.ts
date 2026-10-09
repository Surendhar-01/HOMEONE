import { ForbiddenException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { SupabaseServiceClient } from '../database/supabase.module';
import { SUPABASE_SERVICE } from '../database/supabase.module';
import type { DocumentType, ProviderDocumentRow } from '../database/database.types';
import { assertNoError } from '../database/supabase-error.util';
import { StorageService, BUCKETS } from '../storage/storage.service';

/**
 * Document-level access control. Government IDs are readable only by the owning
 * professional or an admin reviewer. Buckets are private, so every read goes
 * through a short-lived signed URL minted here.
 */
@Injectable()
export class ProviderDocumentsService {
  private readonly logger = new Logger(ProviderDocumentsService.name);

  constructor(
    @Inject(SUPABASE_SERVICE) private readonly client: SupabaseServiceClient,
    private readonly storage: StorageService,
  ) {}

  async listForReviewer(
    providerId: string,
    viewerUserId: string,
    isAdmin: boolean,
  ): Promise<(ProviderDocumentRow & { signedUrl: string; documentType: DocumentType })[]> {
    const { data: provider, error: providerError } = await this.client
      .from('service_providers')
      .select('user_id')
      .eq('id', providerId)
      .maybeSingle();
    assertNoError(providerError);

    if (!provider) {
      throw new NotFoundException('Service provider not found.');
    }

    this.assertAccess(provider.user_id as string, viewerUserId, isAdmin);

    const { data, error } = await this.client
      .from('provider_documents')
      .select('*')
      .eq('provider_id', providerId)
      .order('uploaded_at', { ascending: false });
    assertNoError(error);

    const rows = (data ?? []) as ProviderDocumentRow[];

    return Promise.all(
      rows.map(async (row) => ({
        ...row,
        documentType: row.document_type,
        signedUrl: await this.storage.createSignedUrl(
          bucketFor(row.document_type),
          row.storage_path,
          300,
        ),
      })),
    );
  }

  async getSignedUrl(
    providerId: string,
    documentId: string,
    viewerUserId: string,
    isAdmin: boolean,
  ): Promise<{ signedUrl: string; expiresInSeconds: number; document: ProviderDocumentRow }> {
    const [{ data: provider }, { data: document }] = await Promise.all([
      this.client.from('service_providers').select('user_id').eq('id', providerId).maybeSingle(),
      this.client
        .from('provider_documents')
        .select('*')
        .eq('id', documentId)
        .eq('provider_id', providerId)
        .maybeSingle(),
    ]);

    if (!provider) {
      throw new NotFoundException('Service provider not found.');
    }
    if (!document) {
      throw new NotFoundException('Document not found for this provider.');
    }

    this.assertAccess(provider.user_id as string, viewerUserId, isAdmin);

    const row = document as ProviderDocumentRow;
    return {
      signedUrl: await this.storage.createSignedUrl(
        bucketFor(row.document_type),
        row.storage_path,
        300,
      ),
      expiresInSeconds: 300,
      document: row,
    };
  }

  async delete(
    providerId: string,
    documentId: string,
    viewerUserId: string,
    isAdmin: boolean,
  ): Promise<{ message: string }> {
    const [{ data: provider }, { data: document }] = await Promise.all([
      this.client.from('service_providers').select('user_id').eq('id', providerId).maybeSingle(),
      this.client
        .from('provider_documents')
        .select('*')
        .eq('id', documentId)
        .eq('provider_id', providerId)
        .maybeSingle(),
    ]);

    if (!provider) {
      throw new NotFoundException('Service provider not found.');
    }
    if (!document) {
      throw new NotFoundException('Document not found for this provider.');
    }

    this.assertAccess(provider.user_id as string, viewerUserId, isAdmin);

    const row = document as ProviderDocumentRow;
    await this.storage.remove(bucketFor(row.document_type), row.storage_path);

    const { error } = await this.client.from('provider_documents').delete().eq('id', documentId);
    assertNoError(error);

    this.logger.log(`Document ${documentId} removed`);
    return { message: 'Document deleted.' };
  }

  private assertAccess(ownerId: string, viewerId: string, isAdmin: boolean): void {
    if (isAdmin || ownerId === viewerId) {
      return;
    }
    throw new ForbiddenException('You do not have access to these documents.');
  }
}

function bucketFor(documentType: DocumentType) {
  return documentType === 'WORK_PHOTO' ? BUCKETS.providerWorkPhotos : BUCKETS.providerDocuments;
}
