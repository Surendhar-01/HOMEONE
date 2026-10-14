import { useCallback, useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ApiError, api } from '../../src/services/api';
import type { NotificationItem } from '../../src/types';
import {
  Card,
  EmptyState,
  ErrorMessage,
  LoadingIndicator,
  PrimaryButton,
  Screen,
} from '../../src/components/common';

export default function ProviderNotifications() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await api<{ items: NotificationItem[] }>('/notifications');
      setItems(data.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load notifications.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  async function markRead(id: string) {
    await api(`/notifications/${id}/read`, { method: 'PATCH' }).catch(() => null);
    await load();
  }

  if (loading) {
    return (
      <Screen>
        <LoadingIndicator message="Loading notifications…" />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView>
        <ErrorMessage message={error} />
        {items.length === 0 && !error ? (
          <EmptyState
            title="No notifications"
            message="Booking requests, approvals and job updates appear here."
          />
        ) : null}
        {items.map((item) => (
          <Card key={item.id}>
            <Text className="text-[15px] font-bold text-slate-900">
              {item.title} {item.isRead ? '' : '•'}
            </Text>
            <Text className="mt-1 text-sm text-slate-600">{item.message}</Text>
            {!item.isRead ? (
              <PrimaryButton title="Mark as Read" onPress={() => markRead(item.id)} />
            ) : null}
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}
