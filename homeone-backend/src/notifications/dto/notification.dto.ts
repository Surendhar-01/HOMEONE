import { ApiProperty } from '@nestjs/swagger';

export class NotificationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ example: 'Approved' })
  title!: string;

  @ApiProperty({
    example:
      'Congratulations! Your service provider account has been approved. You can now access your service provider dashboard.',
  })
  message!: string;

  @ApiProperty({ example: 'VERIFICATION_STATUS' })
  notificationType!: string;

  @ApiProperty({ example: false })
  isRead!: boolean;

  @ApiProperty({ format: 'date-time' })
  createdAt!: string;
}

export class NotificationListDto {
  @ApiProperty({ type: [NotificationResponseDto] })
  items!: NotificationResponseDto[];

  @ApiProperty({ example: 3, description: 'Number of unread notifications.' })
  unreadCount!: number;

  @ApiProperty({ example: 25 })
  limit!: number;

  @ApiProperty({ example: 0 })
  offset!: number;
}
