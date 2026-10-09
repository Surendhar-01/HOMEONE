import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Put,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { FileFieldsInterceptor, FileInterceptor } from '@nestjs/platform-express';
import { UploadedFile } from '@nestjs/common';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public, Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import {
  memoryDocumentUpload,
  memoryWorkPhotoUpload,
  requireWorkPhotos,
} from '../storage/upload.config';
import { ProvidersService } from './providers.service';
import {
  RegisterProviderDto,
  UpdateProviderDto,
  UpdateSkillsDto,
  UpdateWorkingHoursDto,
  UploadProviderDocumentDto,
  VerificationStatusResponseDto,
} from './dto/register-provider.dto';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_DOCUMENT_BYTES = 10 * 1024 * 1024;

@ApiTags('Service Provider')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('providers')
export class ProvidersController {
  constructor(private readonly providersService: ProvidersService) {}

  @Public()
  @Post('register')
  @ApiOperation({
    summary: 'Register a service provider',
    description:
      'Creates the auth account and the provider record with verification_status = PENDING. Documents are uploaded afterwards via /providers/documents and /providers/work-photos.',
  })
  @ApiCreatedResponse({ description: 'Provider registered and OTP dispatched.' })
  @ApiBadRequestResponse({ description: 'Validation failed.' })
  register(@Body() dto: RegisterProviderDto) {
    return this.providersService.registerProvider(dto);
  }

  @Get('me')
  @Roles('PROFESSIONAL')
  @ApiOperation({ summary: 'Return the authenticated provider profile' })
  @ApiOkResponse({ description: 'Provider profile with skills, hours and documents.' })
  @ApiNotFoundResponse({ description: 'No provider profile exists for this account.' })
  me(@CurrentUser('id') userId: string) {
    return this.providersService.getMyProvider(userId);
  }

  @Patch('me')
  @Roles('PROFESSIONAL')
  @ApiOperation({
    summary: 'Update the provider profile',
    description:
      'Editable by the provider only. Changing details on an approved, rejected or blocked account returns it to PENDING for re-review.',
  })
  @ApiOkResponse({ description: 'Updated provider profile.' })
  @ApiForbiddenResponse({ description: 'Provider cannot change their own verification status.' })
  updateMe(@CurrentUser('id') userId: string, @Body() dto: UpdateProviderDto) {
    return this.providersService.updateProvider(userId, dto);
  }

  @Post('documents')
  @Roles('PROFESSIONAL')
  @UseInterceptors(FileInterceptor('file', memoryDocumentUpload(MAX_DOCUMENT_BYTES)))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['documentType', 'file'],
      properties: {
        documentType: { type: 'string', enum: ['GOVERNMENT_ID', 'CERTIFICATE'] },
        noCertificate: { type: 'boolean', default: false },
        file: { type: 'string', format: 'binary' },
      },
    },
  })
  @ApiOperation({
    summary: 'Upload a government ID or certificate',
    description:
      'Files are stored in the private `provider-documents` bucket. A certificate is optional: send noCertificate=true instead of a file when the professional has none.',
  })
  @ApiOkResponse({ description: 'Updated provider profile.' })
  @ApiBadRequestResponse({ description: 'Missing file, unsupported type, or size over the limit.' })
  uploadDocument(
    @CurrentUser('id') userId: string,
    @Body() dto: UploadProviderDocumentDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    return this.providersService.attachDocument(
      userId,
      dto.documentType,
      file ?? null,
      dto.noCertificate === true,
    );
  }

  @Get('documents')
  @Roles('PROFESSIONAL')
  @ApiQuery({ name: 'signedUrls', required: false, type: Boolean, default: true })
  @ApiOperation({
    summary: 'List the provider documents with short-lived signed URLs',
    description: 'Signed URLs expire after 5 minutes and are never cached by the app.',
  })
  @ApiOkResponse({ description: 'Document metadata plus signed URLs.' })
  async listDocuments(@CurrentUser('id') userId: string, @Query('signedUrls') signedUrls?: string) {
    const provider = await this.providersService.requireProvider(userId);
    return this.providersService.listDocuments(provider.id, signedUrls !== 'false');
  }

  @Post('work-photos')
  @Roles('PROFESSIONAL')
  @UseInterceptors(
    FileFieldsInterceptor(
      [{ name: 'files', maxCount: 10 }],
      memoryWorkPhotoUpload(MAX_IMAGE_BYTES),
    ),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['files'],
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          maxItems: 10,
        },
      },
    },
  })
  @ApiOperation({ summary: 'Upload up to 10 work photos (JPG, JPEG or PNG)' })
  @ApiOkResponse({ description: 'Updated provider profile.' })
  uploadWorkPhotos(
    @CurrentUser('id') userId: string,
    @UploadedFiles() files?: { files?: Express.Multer.File[] },
  ) {
    return this.providersService.attachWorkPhotos(userId, requireWorkPhotos(files?.files));
  }

  @Put('skills')
  @Roles('PROFESSIONAL')
  @ApiOperation({
    summary: 'Replace the selected skills / services',
    description: 'Skills must belong to the provider selected domain. The full list is replaced.',
  })
  @ApiOkResponse({ description: 'Updated provider profile.' })
  @ApiBadRequestResponse({ description: 'A skill does not belong to the selected domain.' })
  updateSkills(@CurrentUser('id') userId: string, @Body() dto: UpdateSkillsDto) {
    return this.providersService.updateSkills(userId, dto);
  }

  @Put('working-hours')
  @Roles('PROFESSIONAL')
  @ApiOperation({
    summary: 'Replace working days and times',
    description: 'endTime must be later than startTime. Each day may appear once.',
  })
  @ApiOkResponse({ description: 'Updated provider profile.' })
  @ApiBadRequestResponse({ description: 'Invalid time range or duplicate day.' })
  updateWorkingHours(@CurrentUser('id') userId: string, @Body() dto: UpdateWorkingHoursDto) {
    return this.providersService.updateWorkingHours(userId, dto);
  }

  @Get('verification-status')
  @Roles('PROFESSIONAL')
  @ApiOperation({
    summary: 'Current verification status and the matching notification copy',
    description:
      'Returns one of PENDING, APPROVED, REJECTED or BLOCKED, along with the title, message, reason and whether the dashboard is unlocked.',
  })
  @ApiOkResponse({ type: VerificationStatusResponseDto })
  @ApiNotFoundResponse({ description: 'No provider profile exists for this account.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  verificationStatus(@CurrentUser('id') userId: string) {
    return this.providersService.getVerificationStatus(userId);
  }
}
