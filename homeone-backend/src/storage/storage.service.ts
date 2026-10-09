import { randomUUID } from 'node:crypto';
import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { SupabaseServiceClient } from '../database/supabase.module';
import { SUPABASE_SERVICE } from '../database/supabase.module';

export const BUCKETS = {
  profilePhotos: 'profile-photos',
  providerDocuments: 'provider-documents',
  providerWorkPhotos: 'provider-work-photos',
} as const;

export type BucketName = (typeof BUCKETS)[keyof typeof BUCKETS];

const ALLOWED_MIME: Record<BucketName, { images: string[]; documents: string[] }> = {
  [BUCKETS.profilePhotos]: {
    images: ['image/jpeg', 'image/jpg', 'image/png'],
    documents: [],
  },
  [BUCKETS.providerDocuments]: {
    images: ['image/jpeg', 'image/jpg', 'image/png'],
    documents: ['application/pdf'],
  },
  [BUCKETS.providerWorkPhotos]: {
    images: ['image/jpeg', 'image/jpg', 'image/png'],
    documents: [],
  },
};

export interface UploadedObject {
  path: string;
  size: number;
  mimeType: string;
}

/**
 * Wraps Supabase Storage. Every bucket is private, so nothing is served from a
 * public URL. Callers request a short-lived signed URL only after an ownership
 * or admin check has passed.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  constructor(
    @Inject(SUPABASE_SERVICE) private readonly client: SupabaseServiceClient,
    private readonly config: ConfigService,
  ) {}

  async uploadImage(
    userId: string,
    bucket: BucketName,
    file: Express.Multer.File,
  ): Promise<UploadedObject> {
    const allowed = ALLOWED_MIME[bucket].images;
    return this.upload(userId, bucket, file, allowed, 'image');
  }

  async uploadDocument(
    userId: string,
    bucket: BucketName,
    file: Express.Multer.File,
  ): Promise<UploadedObject> {
    const allowed = [...ALLOWED_MIME[bucket].images, ...ALLOWED_MIME[bucket].documents];
    return this.upload(userId, bucket, file, allowed, 'document');
  }

  private async upload(
    userId: string,
    bucket: BucketName,
    file: Express.Multer.File,
    allowedMime: string[],
    prefix: string,
  ): Promise<UploadedObject> {
    const mime = (file.mimetype || '').toLowerCase();
    if (!allowedMime.includes(mime)) {
      throw new Error(`Unsupported file type. Allowed: ${allowedMime.join(', ')}.`);
    }

    const limits =
      prefix === 'image'
        ? this.config.get<number>('app.upload.maxImageBytes', 5 * 1024 * 1024)
        : this.config.get<number>('app.upload.maxDocumentBytes', 10 * 1024 * 1024);

    if (file.size > limits) {
      const limitMb = Math.round(limits / (1024 * 1024));
      throw new Error(`File is larger than the ${limitMb} MB limit.`);
    }

    const extension = this.extensionFor(mime);
    const path = `${userId}/${prefix}/${randomUUID()}${extension}`;

    const { error } = await this.client.storage.from(bucket).upload(path, file.buffer, {
      contentType: mime,
      upsert: false,
    });

    if (error) {
      this.logger.error(`Storage upload failed for ${bucket}: ${error.message}`);
      throw new Error('Failed to store the uploaded file.');
    }

    return { path, size: file.size, mimeType: mime };
  }

  /** Short-lived signed URL. Never cache these on the client. */
  async createSignedUrl(bucket: BucketName, path: string, expiresInSeconds = 300): Promise<string> {
    const { data, error } = await this.client.storage
      .from(bucket)
      .createSignedUrl(path, expiresInSeconds);
    if (error || !data?.signedUrl) {
      this.logger.warn(`Signed URL failed for ${bucket}/${path}: ${error?.message}`);
      throw new NotFoundException('Stored file could not be retrieved.');
    }
    return data.signedUrl;
  }

  async remove(bucket: BucketName, path: string): Promise<void> {
    const { error } = await this.client.storage.from(bucket).remove([path]);
    if (error) {
      this.logger.warn(`Storage remove failed for ${bucket}/${path}: ${error.message}`);
    }
  }

  private extensionFor(mime: string): string {
    switch (mime) {
      case 'image/jpeg':
      case 'image/jpg':
        return '.jpg';
      case 'image/png':
        return '.png';
      case 'application/pdf':
        return '.pdf';
      default:
        return '';
    }
  }
}
