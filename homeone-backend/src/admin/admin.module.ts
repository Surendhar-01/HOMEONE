import { Module } from '@nestjs/common';
import { ProviderDocumentsModule } from '../provider-documents/provider-documents.module';
import { ProviderVerificationModule } from '../provider-verification/provider-verification.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Module({
  imports: [ProviderDocumentsModule, ProviderVerificationModule],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
