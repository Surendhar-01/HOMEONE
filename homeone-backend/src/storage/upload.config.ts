import { BadRequestException } from '@nestjs/common';
import { memoryStorage } from 'multer';
import type { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

const IMAGE_MIME = ['image/jpeg', 'image/jpg', 'image/png'];
const DOCUMENT_MIME = [...IMAGE_MIME, 'application/pdf'];

/**
 * Multer keeps files in memory so nothing touches the local disk and buffers
 * can be streamed straight to Supabase Storage. Size limits are enforced here
 * (cheap, before any buffering) and again inside StorageService.
 */
export function memoryImageUpload(maxBytes: number): MulterOptions {
  return {
    storage: memoryStorage(),
    limits: { fileSize: maxBytes, files: 1 },
    fileFilter: (_req, file, cb) => {
      const mime = (file.mimetype || '').toLowerCase();
      if (!IMAGE_MIME.includes(mime)) {
        cb(
          new BadRequestException(`Only JPG, JPEG and PNG images are allowed. Received "${mime}".`),
          false,
        );
        return;
      }
      cb(null, true);
    },
  };
}

export function memoryDocumentUpload(maxBytes: number): MulterOptions {
  return {
    storage: memoryStorage(),
    limits: { fileSize: maxBytes, files: 1 },
    fileFilter: (_req, file, cb) => {
      const mime = (file.mimetype || '').toLowerCase();
      if (!DOCUMENT_MIME.includes(mime)) {
        cb(
          new BadRequestException(
            `Only JPG, JPEG, PNG or PDF files are allowed. Received "${mime}".`,
          ),
          false,
        );
        return;
      }
      cb(null, true);
    },
  };
}

export function memoryWorkPhotoUpload(maxBytes: number): MulterOptions {
  return {
    storage: memoryStorage(),
    limits: { fileSize: maxBytes, files: 10 },
    fileFilter: (_req, file, cb) => {
      const mime = (file.mimetype || '').toLowerCase();
      if (!IMAGE_MIME.includes(mime)) {
        cb(
          new BadRequestException(`Only JPG, JPEG and PNG images are allowed. Received "${mime}".`),
          false,
        );
        return;
      }
      cb(null, true);
    },
  };
}

export function requireUploadedFile(file: Express.Multer.File | undefined): Express.Multer.File {
  if (!file) {
    throw new BadRequestException(
      'No file was uploaded. Send multipart/form-data with a "file" field.',
    );
  }
  return file;
}

export function requireWorkPhotos(files: Express.Multer.File[] | undefined): Express.Multer.File[] {
  if (!files || files.length === 0) {
    throw new BadRequestException('At least one work photo must be uploaded.');
  }
  return files;
}
