import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
  ApiConsumes,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { FileFieldsInterceptor } from '@nestjs/platform-express';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { memoryWorkPhotoUpload, requireWorkPhotos } from '../storage/upload.config';
import { BookingsService } from './bookings.service';
import { AuthenticatedUser } from '../database/database.types';
import {
  BookingResponseDto,
  CreateBookingDto,
  ListBookingsQueryDto,
  UpdateBookingStatusDto,
} from './dto/booking.dto';

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const uuid = () => new ParseUUIDPipe({ version: '4' });

@ApiTags('Bookings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Post()
  @Roles('CUSTOMER')
  @ApiOperation({
    summary: 'Request a booking',
    description:
      'The provider must be approved and must offer the selected service. Repeating a request with the same idempotencyKey returns the original booking instead of a duplicate.',
  })
  @ApiCreatedResponse({ type: BookingResponseDto })
  @ApiBadRequestResponse({ description: 'Validation failed or provider unavailable.' })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  create(@CurrentUser('id') customerId: string, @Body() dto: CreateBookingDto) {
    return this.bookingsService.create(customerId, dto);
  }

  @Get()
  @Roles('CUSTOMER', 'PROFESSIONAL')
  @ApiOperation({
    summary: 'List bookings for the authenticated user',
    description: 'Customers see their own bookings; professionals see bookings assigned to them.',
  })
  @ApiOkResponse({ description: 'Bookings newest first.' })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListBookingsQueryDto) {
    return this.bookingsService.listForUser(user, query);
  }

  @Get(':id')
  @Roles('CUSTOMER', 'PROFESSIONAL')
  @ApiOperation({ summary: 'Booking detail with status history and photo URLs' })
  @ApiOkResponse({ type: BookingResponseDto })
  @ApiNotFoundResponse({ description: 'Booking not found.' })
  @ApiForbiddenResponse({ description: 'Booking belongs to another account.' })
  getOne(@Param('id', uuid()) bookingId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.bookingsService.getForUser(bookingId, user);
  }

  @Patch(':id/status')
  @Roles('CUSTOMER', 'PROFESSIONAL')
  @ApiOperation({
    summary: 'Advance the booking status',
    description:
      'Only legal transitions are accepted, and only by the correct side: professionals accept/reject and advance the job; customers cancel. Rejections require a reason. Every change is audited and notified.',
  })
  @ApiOkResponse({ type: BookingResponseDto })
  @ApiBadRequestResponse({ description: 'Illegal transition or missing reason.' })
  @ApiForbiddenResponse({ description: 'Wrong side or foreign booking.' })
  updateStatus(
    @Param('id', uuid()) bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateBookingStatusDto,
  ) {
    return this.bookingsService.updateStatus(bookingId, user, dto);
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
  @ApiOperation({
    summary: 'Attach problem photos to a requested booking',
    description: 'Up to 3 images, only while the booking is still REQUESTED.',
  })
  @ApiOkResponse({ type: BookingResponseDto })
  addPhotos(
    @Param('id', uuid()) bookingId: string,
    @CurrentUser() user: AuthenticatedUser,
    @UploadedFiles() files?: { files?: Express.Multer.File[] },
  ) {
    return this.bookingsService.addPhotos(bookingId, user, requireWorkPhotos(files?.files));
  }
}
