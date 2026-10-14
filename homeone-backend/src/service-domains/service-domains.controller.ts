import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ServiceDomainsService } from './service-domains.service';
import { ServiceDomainResponseDto } from './dto/service-domain.dto';

@ApiTags('Service Domains')
@Controller('service-domains')
@UseGuards(JwtAuthGuard)
export class ServiceDomainsController {
  constructor(private readonly serviceDomainsService: ServiceDomainsService) {}

  @Public()
  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List active service domains',
    description: 'Powers the provider registration domain dropdown. Loaded from Supabase.',
  })
  @ApiOkResponse({ type: [ServiceDomainResponseDto] })
  findAll() {
    return this.serviceDomainsService.findAllActive();
  }
}
