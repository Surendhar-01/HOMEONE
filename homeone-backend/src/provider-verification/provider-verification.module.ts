import { Module } from '@nestjs/common';
import { ProviderVerificationService } from './provider-verification.service';

/**
 * Owns every mutation of `service_providers.verification_status`. Exported so
 * `AdminModule` is the only consumer that can trigger a status change.
 */
@Module({
  providers: [ProviderVerificationService],
  exports: [ProviderVerificationService],
})
export class ProviderVerificationModule {}