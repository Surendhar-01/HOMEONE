import { useCallback, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ApiError } from '../../src/services/api';
import { listBookings, type Booking } from '../../src/services/bookingService';
import {
  Card,
  EmptyState,
  ErrorMessage,
  LoadingIndicator,
  Screen,
} from '../../src/components/common';
import { StatusPill } from '../../src/components/common';

type Section = 'upcoming' | 'ongoing' | 'completed';

const UPCOMING: string[] = ['ACCEPTED'];
const ONGOING: string[] = ['ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'];
const COMPLETED: string[] = ['COMPLETED', 'REJECTED', 'CANCELLED'];

export default function MyJobs() {
  const [section, setSection] = useState<Section>('upcoming');
  const [items, setItems] = useState<Booking[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setError(null);
      const result = await listBookings();
      const wanted =
        section === 'upcoming' ? UPCOMING : section === 'ongoing' ? ONGOING : COMPLETED;
      setItems(result.items.filter((b) => wanted.includes(b.status)));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load jobs.');
    } finally {
      setLoading(false);
    }
  }, [section]);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  if (loading) {
    return (
      <Screen>
        <LoadingIndicator message="Loading jobs…" />
      </Screen>
    );
  }

  return (
    <Screen>
      <View className="mb-3 flex-row rounded-xl bg-slate-100 p-1">
        {(['upcoming', 'ongoing', 'completed'] as Section[]).map((name) => (
          <Pressable
            key={name}
            onPress={() => {
              setSection(name);
              setLoading(true);
            }}
            className={`flex-1 items-center rounded-lg py-2 ${section === name ? 'bg-white shadow-sm' : ''}`}
          >
            <Text
              className={`text-[13px] font-bold capitalize ${section === name ? 'text-blue-700' : 'text-slate-400'}`}
            >
              {name}
            </Text>
          </Pressable>
        ))}
      </View>

      <ErrorMessage message={error} />

      <ScrollView>
        {items.length === 0 && !error ? (
          <EmptyState title={`No ${section} jobs`} message="Accepted jobs appear here." />
        ) : null}
        {items.map((job) => (
          <Card key={job.id}>
            <View className="flex-row items-start justify-between">
              <View className="flex-1">
                <Text className="text-[16px] font-bold text-slate-900">
                  {job.serviceName ?? 'Service'}
                </Text>
                <Text className="text-xs text-slate-400">ID: {job.id.slice(0, 8)}</Text>
              </View>
              <StatusPill status={job.status} />
            </View>
            <Text className="mt-1 text-sm text-slate-600">{job.address}</Text>
            <Text className="text-xs text-slate-400">
              {new Date(job.scheduledAt).toLocaleString()}
            </Text>
            <Pressable
              onPress={() => router.push({ pathname: '/(provider)/job', params: { id: job.id } })}
              className="mt-3 items-center rounded-xl bg-blue-700 py-3 active:bg-blue-800"
            >
              <Text className="text-sm font-bold text-white">View Details</Text>
            </Pressable>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}
