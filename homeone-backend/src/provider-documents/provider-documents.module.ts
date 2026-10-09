import { Module } from '@nestjs/common';
import { ProviderDocumentsService } from './provider-documents.service';

/**
 * Document access control for the admin review flow. Imported by both
 * `ProvidersModule` (owner access) and `AdminModule` (reviewer access) so the
 * two paths share one implementation.
 */
@Module({
  providers: [ProviderDocumentsService],
  exports: [ProviderDocumentsService],
})
export class ProviderDocumentsModule {}