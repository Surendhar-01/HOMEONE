import { Module } from '@nestjs/common';
import { ProviderDocumentsModule } from '../provider-documents/provider-documents.module';
import { ProviderVerificationModule } from '../provider-verification/provider-verification.module';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';

@Module({
  imports: [ProviderDocumentsModule, ProviderVerificationModule],
  controllers: [ProvidersController],
  providers: [ProvidersService],
  exports: [ProvidersService],
})
export class ProvidersModule {}
