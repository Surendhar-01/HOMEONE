import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiBody,
  ApiConflictResponse,
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
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public, Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { memoryWorkPhotoUpload, requireWorkPhotos } from '../storage/upload.config';
import { ReviewsService } from './reviews.service';
import {
  CreateReviewDto,
  ProviderRatingSummaryDto,
  PublicReviewResponseDto,
  ReviewResponseDto,
} from './dto/review.dto';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const uuid = () => new ParseUUIDPipe({ version: '4' });

@ApiTags('Reviews')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post()
  @Roles('CUSTOMER')
  @ApiOperation({
    summary: 'Review a completed booking',
    description: 'Exactly one review per booking. Only the booking customer, only when completed.',
  })
  @ApiCreatedResponse({ type: ReviewResponseDto })
  @ApiBadRequestResponse({ description: 'Booking not completed.' })
  @ApiConflictResponse({ description: 'Booking already reviewed.' })
  @ApiForbiddenResponse({ description: 'Not your booking.' })
  create(@CurrentUser('id') customerId: string, @Body() dto: CreateReviewDto) {
    return this.reviewsService.create(customerId, dto);
  }

  @Get('mine')
  @Roles('CUSTOMER')
  @ApiOperation({ summary: 'Reviews written by the authenticated customer' })
  @ApiOkResponse({ type: [ReviewResponseDto] })
  mine(@CurrentUser('id') customerId: string) {
    return this.reviewsService.listMine(customerId);
  }

  @Public()
  @Get('provider')
  @ApiOperation({
    summary: 'Public reviews for a professional (no customer identities)',
    description: 'Ratings and comments only. Customer ids are never exposed.',
  })
  @ApiQuery({ name: 'providerId', required: true, type: String, format: 'uuid' })
  @ApiOkResponse({ type: [PublicReviewResponseDto] })
  forProvider(@Query('providerId') providerId: string) {
    return this.reviewsService.listForProvider(providerId);
  }

  @Public()
  @Get('provider-rating')
  @ApiOperation({ summary: 'Average rating and review count for a professional' })
  @ApiQuery({ name: 'providerId', required: true, type: String, format: 'uuid' })
  @ApiOkResponse({ type: ProviderRatingSummaryDto })
  rating(@Query('providerId') providerId: string) {
    return this.reviewsService.ratingSummary(providerId);
  }

  @Post(':id/photos')
  @Roles('CUSTOMER')
  @UseInterceptors(
    FileFieldsInterceptor([{ name: 'files', maxCount: 3 }], memoryWorkPhotoUpload(MAX_IMAGE_BYTES)),
  )
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['files'],
      properties: {
        files: { type: 'array', items: { type: 'string', format: 'binary' }, maxItems: 3 },
      },
    },
  })
  @ApiOperation({ summary: 'Attach up to 3 photos to your review' })
  @ApiOkResponse({ type: ReviewResponseDto })
  @ApiNotFoundResponse({ description: 'Review not found.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  addPhotos(
    @Param('id', uuid()) reviewId: string,
    @CurrentUser('id') customerId: string,
    @UploadedFiles() files?: { files?: Express.Multer.File[] },
  ) {
    return this.reviewsService.addPhotos(reviewId, customerId, requireWorkPhotos(files?.files));
  }
}
