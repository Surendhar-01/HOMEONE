import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiPropertyOptional,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { NotificationsService } from './notifications.service';
import type {
  NotificationListDto,
  NotificationResponseDto,
} from './dto/notification.dto';

class NotificationQueryDto {
  @ApiPropertyOptional({ example: 25, minimum: 1, maximum: 100, default: 25 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ example: 0, minimum: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  offset?: number;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  unreadOnly?: boolean;
}

@ApiTags('Notifications')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({
    summary: 'List notifications for the authenticated user',
    description: 'Newest first, with the unread count for the badge in the app.',
  })
  @ApiOkResponse({ type: NotificationListDto })
  @ApiUnauthorizedResponse({ description: 'Missing or invalid access token.' })
  list(@CurrentUser('id') userId: string, @Query() query: NotificationQueryDto) {
    return this.notificationsService.listForUser(
      userId,
      query.limit ?? 25,
      query.offset ?? 0,
      query.unreadOnly === true,
    );
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'Mark every notification as read' })
  @ApiOkResponse({ description: 'Number of notifications updated.' })
  markAllRead(@CurrentUser('id') userId: string) {
    return this.notificationsService.markAllRead(userId);
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'Mark one notification as read' })
  @ApiOkResponse({ type: NotificationResponseDto })
  @ApiNotFoundResponse({ description: 'Notification not found or belongs to another user.' })
  markRead(
    @CurrentUser('id') userId: string,
    @Param('id', new ParseUUIDPipe({ version: '4' })) notificationId: string,
  ) {
    return this.notificationsService.markRead(userId, notificationId);
  }
}