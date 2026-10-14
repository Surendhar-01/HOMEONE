import { Module } from '@nestjs/common';
import { ServiceDomainsController } from './service-domains.controller';
import { ServiceDomainsService } from './service-domains.service';

@Module({
  controllers: [ServiceDomainsController],
  providers: [ServiceDomainsService],
  exports: [ServiceDomainsService],
})
export class ServiceDomainsModule {}
