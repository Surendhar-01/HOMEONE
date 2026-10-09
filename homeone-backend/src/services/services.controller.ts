import { BadRequestException, Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { Public } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ServicesService } from './services.service';
import type { ServiceResponseDto } from './dto/service.dto';

@ApiTags('Services')
@Controller('services')
@UseGuards(JwtAuthGuard)
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Public()
  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'List active services for a service domain',
    description:
      'Call this after the provider selects a domain so the multi-select skill list is scoped to that domain.',
  })
  @ApiQuery({
    name: 'domainId',
    required: true,
    type: String,
    format: 'uuid',
    example: '9f1d0c2e-6f0e-4f2a-9c1a-2b3c4d5e6f70',
  })
  @ApiOkResponse({ type: [ServiceResponseDto] })
  @ApiBadRequestResponse({ description: 'domainId is missing or unknown.' })
  findByDomain(@Query('domainId') domainId?: string) {
    if (!domainId) {
      throw new BadRequestException('domainId query parameter is required.');
    }
    return this.servicesService.findByDomain(domainId);
  }
}