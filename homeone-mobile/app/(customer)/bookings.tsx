import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ApiError } from '../../src/services/api';
import {
  bookingStatusLabel,
  listBookings,
  type Booking,
  type BookingStatus,
} from '../../src/services/bookingService';
import {
  Card,
  EmptyState,
  ErrorMessage,
  LoadingIndicator,
  Screen,
  StatusPill,
} from '../../src/components/common';

const FILTERS: ('ALL' | BookingStatus)[] = [
  'ALL',
  'REQUESTED',
  'ACCEPTED',
  'ON_THE_WAY',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
];

export default function Bookings() {
  const [items, setItems] = useState<Booking[]>([]);
  const [filter, setFilter] = useState<'ALL' | BookingStatus>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setError(null);
      const result = await listBookings(filter === 'ALL' ? undefined : filter);
      setItems(result.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load bookings.');
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  if (loading) {
    return (
      <Screen>
        <LoadingIndicator message="Loading bookings…" />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
          <View className="flex-row gap-2 pr-4">
            {FILTERS.map((status) => (
              <Pressable
                key={status}
                onPress={() => {
                  setFilter(status);
                  setLoading(true);
                }}
                className={`rounded-full border px-3.5 py-2 ${
                  filter === status ? 'border-blue-700 bg-blue-50' : 'border-slate-200 bg-white'
                }`}
              >
                <Text
                  className={`text-[13px] ${
                    filter === status ? 'font-bold text-blue-800' : 'text-slate-600'
                  }`}
                >
                  {status === 'ALL' ? 'All' : bookingStatusLabel(status)}
                </Text>
              </Pressable>
            ))}
          </View>
        </ScrollView>

        <ErrorMessage message={error} />

        {items.length === 0 && !error ? (
          <EmptyState title="No bookings" message="Book a service to see it tracked here." />
        ) : null}

        {items.map((booking) => (
          <Card key={booking.id}>
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <Text className="text-[16px] font-bold text-slate-900">
                  {booking.serviceName ?? 'Service'}
                </Text>
                <Text className="text-sm text-slate-500">
                  {booking.providerName ?? 'Professional'}
                </Text>
              </View>
              <StatusPill status={booking.status} />
            </View>
            <Text className="mt-1 text-[13px] text-slate-500" numberOfLines={1}>
              {booking.address}
            </Text>
            <Text className="text-xs text-slate-400">
              {new Date(booking.scheduledAt).toLocaleString()}
            </Text>
            <Pressable
              onPress={() =>
                router.push({ pathname: '/(customer)/booking', params: { id: booking.id } })
              }
              className="mt-3 items-center rounded-xl bg-blue-700 py-3 active:bg-blue-800"
            >
              <Text className="text-sm font-bold text-white">View & Track</Text>
            </Pressable>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}
