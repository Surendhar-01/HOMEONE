import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, Linking, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ApiError } from '../../src/services/api';
import {
  getBooking,
  updateBookingStatus,
  type Booking,
  type BookingStatus,
} from '../../src/services/bookingService';
import {
  Card,
  ErrorMessage,
  LoadingIndicator,
  PrimaryButton,
  Screen,
  SuccessMessage,
} from '../../src/components/common';
import { StatusPill } from '../../src/components/common';

const NEXT_ACTION: { from: BookingStatus; to: BookingStatus; label: string; confirm: string }[] = [
  { from: 'ACCEPTED', to: 'ON_THE_WAY', label: 'Start Travel (On the Way)', confirm: 'Heading to the customer now?' },
  { from: 'ON_THE_WAY', to: 'ARRIVED', label: 'Mark Arrived', confirm: 'Have you arrived at the location?' },
  { from: 'ARRIVED', to: 'IN_PROGRESS', label: 'Start Service', confirm: 'Start the service now?' },
  { from: 'IN_PROGRESS', to: 'COMPLETED', label: 'Mark Completed', confirm: 'Is the service fully completed?' },
];

export default function JobDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [job, setJob] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      setJob(await getBooking(id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load the job.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  function advance(to: BookingStatus, confirmMessage: string) {
    if (!job) return;
    Alert.alert('Confirm status change', confirmMessage, [
      { text: 'Back', style: 'cancel' },
      {
        text: 'Confirm',
        onPress: async () => {
          setActing(true);
          setError(null);
          try {
            const updated = await updateBookingStatus(job.id, to);
            setJob(updated);
            setInfo(`Status updated. The customer was notified.`);
          } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Could not update status.');
          } finally {
            setActing(false);
          }
        },
      },
    ]);
  }

  function openDirections() {
    if (!job || job.latitude === null || job.longitude === null) {
      setError('No coordinates available for this job.');
      return;
    }
    const url = `https://www.google.com/maps/dir/?api=1&destination=${job.latitude},${job.longitude}`;
    Linking.openURL(url).catch(() => setError('Could not open the maps application.'));
  }

  if (loading) {
    return (
      <Screen>
        <LoadingIndicator message="Loading job…" />
      </Screen>
    );
  }

  if (!job) {
    return (
      <Screen>
        <ErrorMessage message={error ?? 'Job not found.'} />
      </Screen>
    );
  }

  const next = NEXT_ACTION.find((a) => a.from === job.status);

  return (
    <Screen>
      <ScrollView>
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-xl font-bold text-slate-900">{job.serviceName ?? 'Job'}</Text>
          <StatusPill status={job.status} />
        </View>
        <Text className="mb-4 text-xs text-slate-400">Booking ID: {job.id}</Text>

        <Card>
          <Text className="mb-1 text-base font-bold text-slate-900">Customer Service Details</Text>
          <Text className="text-sm text-slate-600">{job.address}</Text>
          <Text className="text-sm text-slate-600">
            Scheduled: {new Date(job.scheduledAt).toLocaleString()}
          </Text>
          <Text className="text-sm text-slate-600">Urgency: {job.urgency}</Text>
          <Text className="mt-1 text-sm text-slate-700">{job.problemDescription}</Text>
        </Card>

        {job.photoUrls.length > 0 ? (
          <Card>
            <Text className="mb-2 text-base font-bold text-slate-900">Problem Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {job.photoUrls.map((uri, index) => (
                <Image key={index} source={{ uri }} className="mr-2 h-28 w-28 rounded-xl" />
              ))}
            </ScrollView>
          </Card>
        ) : null}

        <Card>
          <Text className="mb-1 text-base font-bold text-slate-900">Location & Navigation</Text>
          {job.latitude !== null && job.longitude !== null ? (
            <Text className="mb-2 text-xs text-slate-400">
              {job.latitude.toFixed(5)}, {job.longitude.toFixed(5)}
            </Text>
          ) : (
            <Text className="mb-2 text-sm text-slate-500">No GPS pin — navigate by address.</Text>
          )}
          <PrimaryButton title="Open Directions" onPress={openDirections} />
        </Card>

        {next ? (
          <PrimaryButton
            title={acting ? 'Updating…' : next.label}
            onPress={() => advance(next.to, next.confirm)}
          />
        ) : null}

        <ErrorMessage message={error} />
        <SuccessMessage message={info} />
      </ScrollView>
    </Screen>
  );
}
