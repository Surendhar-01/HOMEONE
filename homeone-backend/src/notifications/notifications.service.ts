import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import type { SupabaseServiceClient } from '../database/supabase.module';
import { SUPABASE_SERVICE } from '../database/supabase.module';
import type { NotificationRow } from '../database/database.types';
import { assertNoError } from '../database/supabase-error.util';
import type { NotificationListDto, NotificationResponseDto } from './dto/notification.dto';

@Injectable()
export class NotificationsService {
  constructor(@Inject(SUPABASE_SERVICE) private readonly client: SupabaseServiceClient) {}

  async listForUser(
    userId: string,
    limit: number,
    offset: number,
    unreadOnly = false,
  ): Promise<NotificationListDto> {
    let query = this.client
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (unreadOnly) {
      query = query.eq('is_read', false);
    }

    const { data, error } = await query;
    assertNoError(error);

    const { count: unreadCount } = await this.client
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false);

    return {
      items: ((data ?? []) as NotificationRow[]).map(toNotificationDto),
      unreadCount: unreadCount ?? 0,
      limit,
      offset,
    };
  }

  async markRead(userId: string, notificationId: string): Promise<NotificationResponseDto> {
    const { data, error } = await this.client
      .from('notifications')
      .update({ is_read: true })
      .eq('id', notificationId)
      .eq('user_id', userId)
      .select('*')
      .maybeSingle();
    assertNoError(error);

    if (!data) {
      throw new NotFoundException('Notification not found.');
    }

    return toNotificationDto(data as NotificationRow);
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const { data, error } = await this.client
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
      .select('id');
    assertNoError(error);

    return { updated: (data ?? []).length };
  }

  /** Used by verification flows to notify the professional. */
  async createForUser(
    userId: string,
    title: string,
    message: string,
    notificationType = 'GENERAL',
  ): Promise<void> {
    const { error } = await this.client.from('notifications').insert({
      user_id: userId,
      title,
      message,
      notification_type: notificationType,
    });
    assertNoError(error);
  }
}

function toNotificationDto(row: NotificationRow): NotificationResponseDto {
  return {
    id: row.id,
    title: row.title,
    message: row.message,
    notificationType: row.notification_type,
    isRead: row.is_read,
    createdAt: row.created_at,
  };
}