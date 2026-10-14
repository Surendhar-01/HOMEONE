import { useCallback, useEffect, useState } from 'react';
import { Alert, Image, ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { ApiError } from '../../src/services/api';
import {
  bookingStatusLabel,
  getBooking,
  updateBookingStatus,
  type Booking,
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

const TIMELINE: { status: string; label: string }[] = [
  { status: 'REQUESTED', label: 'Request sent' },
  { status: 'ACCEPTED', label: 'Accepted' },
  { status: 'ON_THE_WAY', label: 'On the way' },
  { status: 'ARRIVED', label: 'Arrived' },
  { status: 'IN_PROGRESS', label: 'In progress' },
  { status: 'COMPLETED', label: 'Completed' },
];

export default function BookingDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    if (!id) return;
    try {
      setError(null);
      setBooking(await getBooking(id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load the booking.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function cancel() {
    if (!booking) return;
    Alert.alert('Cancel booking?', 'The professional will be notified.', [
      { text: 'Keep', style: 'cancel' },
      {
        text: 'Cancel Booking',
        style: 'destructive',
        onPress: async () => {
          setActing(true);
          try {
            const updated = await updateBookingStatus(booking.id, 'CANCELLED');
            setBooking(updated);
            setInfo('Booking cancelled.');
          } catch (err) {
            setError(err instanceof ApiError ? err.message : 'Could not cancel.');
          } finally {
            setActing(false);
          }
        },
      },
    ]);
  }

  if (loading) {
    return (
      <Screen>
        <LoadingIndicator message="Loading booking…" />
      </Screen>
    );
  }

  if (!booking) {
    return (
      <Screen>
        <ErrorMessage message={error ?? 'Booking not found.'} />
      </Screen>
    );
  }

  const reached = new Set(booking.history.map((h) => h.newStatus));
  reached.add('REQUESTED');
  const cancellable = ['REQUESTED', 'ACCEPTED', 'ON_THE_WAY', 'ARRIVED'].includes(booking.status);

  return (
    <Screen>
      <ScrollView>
        <View className="mb-3 flex-row items-center justify-between">
          <Text className="text-xl font-bold text-slate-900">
            {booking.serviceName ?? 'Booking'}
          </Text>
          <StatusPill status={booking.status} />
        </View>
        <Text className="mb-4 text-xs text-slate-400">Booking ID: {booking.id}</Text>

        <Card>
          <Text className="mb-2 text-base font-bold text-slate-900">Timeline</Text>
          {TIMELINE.map((step, index) => {
            const done = reached.has(step.status);
            const isCurrent = booking.status === step.status;
            return (
              <View key={step.status} className="flex-row">
                <View className="items-center">
                  <View
                    className={`h-4 w-4 rounded-full ${
                      done ? 'bg-blue-700' : 'border-2 border-slate-300 bg-white'
                    }`}
                  />
                  {index < TIMELINE.length - 1 ? (
                    <View className={`w-0.5 flex-1 ${done ? 'bg-blue-700' : 'bg-slate-200'}`} />
                  ) : null}
                </View>
                <Text
                  className={`mb-4 ml-3 text-sm ${
                    isCurrent ? 'font-bold text-blue-800' : done ? 'text-slate-700' : 'text-slate-400'
                  }`}
                >
                  {step.label}
                  {isCurrent ? ' • current' : ''}
                </Text>
              </View>
            );
          })}
          {booking.status === 'REJECTED' || booking.status === 'CANCELLED' ? (
            <Text className="text-sm font-semibold text-red-600">
              {bookingStatusLabel(booking.status)}
            </Text>
          ) : null}
        </Card>

        <Card>
          <Text className="mb-1 text-base font-bold text-slate-900">Details</Text>
          <DetailRow label="Professional" value={booking.providerName ?? '—'} />
          <DetailRow label="Address" value={booking.address} />
          <DetailRow label="Scheduled" value={new Date(booking.scheduledAt).toLocaleString()} />
          <DetailRow label="Urgency" value={booking.urgency} />
          <DetailRow label="Problem" value={booking.problemDescription} />
        </Card>

        {booking.photoUrls.length > 0 ? (
          <Card>
            <Text className="mb-2 text-base font-bold text-slate-900">Problem Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {booking.photoUrls.map((uri, index) => (
                <Image key={index} source={{ uri }} className="mr-2 h-28 w-28 rounded-xl" />
              ))}
            </ScrollView>
          </Card>
        ) : null}

        <ErrorMessage message={error} />
        <SuccessMessage message={info} />

        {cancellable ? (
          <PrimaryButton title={acting ? 'Cancelling…' : 'Cancel Booking'} onPress={cancel} />
        ) : null}

        {booking.status === 'COMPLETED' ? (
          <PrimaryButton
            title="Rate Service"
            onPress={() =>
              router.push({ pathname: '/(customer)/review', params: { bookingId: booking.id } })
            }
          />
        ) : null}
      </ScrollView>
    </Screen>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-1.5 flex-row justify-between">
      <Text className="text-[13px] font-semibold text-slate-500">{label}</Text>
      <Text className="ml-4 flex-1 text-right text-sm text-slate-800">{value}</Text>
    </View>
  );
}
