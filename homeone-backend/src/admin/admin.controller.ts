import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AdminService } from './admin.service';
import type {
  AdminDocumentDto,
  AdminProviderDetailDto,
  ListProvidersQueryDto,
  PendingProviderListDto,
  ReviewActionDto,
  VerificationActionResponseDto,
  VerificationHistoryDto,
} from './dto/admin.dto';

const uuid = () => new ParseUUIDPipe({ version: '4' });

@ApiTags('Admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('providers/pending')
  @ApiOperation({
    summary: 'List providers awaiting review',
    description: 'Ordered oldest submission first so nothing is starved.',
  })
  @ApiOkResponse({ type: PendingProviderListDto })
  @ApiForbiddenResponse({ description: 'Admin role required.' })
  listPending(@Query() query: ListProvidersQueryDto) {
    return this.adminService.listPendingProviders(query.limit ?? 50, query.offset ?? 0);
  }

  @Get('providers/:id')
  @ApiOperation({
    summary: 'Full provider review detail',
    description:
      'Personal details, domain, skills, experience, languages, business address with coordinates, working hours, current status and the full audit history.',
  })
  @ApiOkResponse({ type: AdminProviderDetailDto })
  @ApiNotFoundResponse({ description: 'Service provider not found.' })
  getProvider(@Param('id', uuid()) providerId: string) {
    return this.adminService.getProviderDetail(providerId);
  }

  @Get('providers/:id/documents')
  @ApiOperation({
    summary: 'Government ID, certificates and work photos with signed URLs',
    description:
      'Each URL is signed for 5 minutes and points at a private bucket. Only admins and the owning professional can obtain them.',
  })
  @ApiOkResponse({ type: [AdminDocumentDto] })
  @ApiNotFoundResponse({ description: 'Provider or documents not found.' })
  getDocuments(@Param('id', uuid()) providerId: string, @CurrentUser('id') adminId: string) {
    return this.adminService.getProviderDocuments(providerId, adminId);
  }

  @Get('providers/:id/history')
  @ApiOperation({ summary: 'Audit log of verification status changes' })
  @ApiOkResponse({ type: [VerificationHistoryDto] })
  getHistory(@Param('id', uuid()) providerId: string) {
    return this.adminService.getHistory(providerId);
  }

  @Patch('providers/:id/approve')
  @ApiOperation({
    summary: 'Approve a provider',
    description:
      'Records the change with the acting admin, notifies the professional, and unlocks the provider dashboard.',
  })
  @ApiOkResponse({ type: VerificationActionResponseDto })
  @ApiBadRequestResponse({ description: 'Provider is already approved.' })
  approve(@Param('id', uuid()) providerId: string, @CurrentUser('id') adminId: string) {
    return this.adminService.approve(providerId, adminId);
  }

  @Patch('providers/:id/reject')
  @ApiOperation({
    summary: 'Reject a provider with a reason',
    description: 'The reason is stored on the provider and shown to them on next login.',
  })
  @ApiOkResponse({ type: VerificationActionResponseDto })
  @ApiBadRequestResponse({ description: 'Reason is required or too short.' })
  reject(
    @Param('id', uuid()) providerId: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: ReviewActionDto,
  ) {
    return this.adminService.reject(providerId, adminId, dto);
  }

  @Patch('providers/:id/block')
  @ApiOperation({
    summary: 'Block a provider with a reason',
    description:
      'A blocked provider loses access to approved-only features and cannot be approved directly; an admin must unblock first.',
  })
  @ApiOkResponse({ type: VerificationActionResponseDto })
  @ApiBadRequestResponse({ description: 'Reason is required or too short.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  block(
    @Param('id', uuid()) providerId: string,
    @CurrentUser('id') adminId: string,
    @Body() dto: ReviewActionDto,
  ) {
    return this.adminService.block(providerId, adminId, dto);
  }
}