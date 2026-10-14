import { Controller, Get, Param, ParseUUIDPipe, Query, UseGuards } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Public } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ProfessionalsService } from './professionals.service';
import {
  DiscoverProfessionalsQueryDto,
  ProfessionalCardDto,
  ProfessionalProfileDto,
} from './dto/professional.dto';

const uuid = () => new ParseUUIDPipe({ version: '4' });

@ApiTags('Professionals')
@Controller('professionals')
@UseGuards(JwtAuthGuard)
export class ProfessionalsController {
  constructor(private readonly professionalsService: ProfessionalsService) {}

  @Public()
  @Get()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Discover approved professionals for a service',
    description:
      'Only APPROVED professionals offering the service are returned. Distances are computed only when customer coordinates are supplied. Ratings are real aggregates; availability is reported, never invented.',
  })
  @ApiOkResponse({ type: [ProfessionalCardDto] })
  @ApiBadRequestResponse({ description: 'serviceId is missing.' })
  discover(@Query() query: DiscoverProfessionalsQueryDto) {
    return this.professionalsService.discover(query);
  }

  @Public()
  @Get(':id')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Public professional profile',
    description:
      'Skills, experience, working hours, work photos and public reviews. Government IDs are never exposed; certificates appear only as a flag.',
  })
  @ApiOkResponse({ type: ProfessionalProfileDto })
  @ApiNotFoundResponse({ description: 'Professional not found or not approved.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  profile(@Param('id', uuid()) providerId: string) {
    return this.professionalsService.getProfile(providerId);
  }
}
