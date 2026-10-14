import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ApiError } from '../../src/services/api';
import {
  listBookings,
  updateBookingStatus,
  type Booking,
} from '../../src/services/bookingService';
import { getVerificationStatus } from '../../src/services/providerService';
import {
  Card,
  CustomInput,
  EmptyState,
  ErrorMessage,
  LoadingIndicator,
  PrimaryButton,
  Screen,
  SecondaryButton,
  SuccessMessage,
} from '../../src/components/common';

export default function JobRequests() {
  const [items, setItems] = useState<Booking[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [approved, setApproved] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const status = await getVerificationStatus();
      setApproved(status.verificationStatus === 'APPROVED');
      if (status.verificationStatus !== 'APPROVED') {
        setItems([]);
        return;
      }
      const result = await listBookings('REQUESTED');
      setItems(result.items);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load requests.');
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

  async function accept(bookingId: string) {
    console.log('[accept] fired for', bookingId);
    setActingId(bookingId);
    console.log('[accept] acting set');
    setError(null);
    try {
      console.log('[accept] calling api');
      await updateBookingStatus(bookingId, 'ACCEPTED');
      console.log('[accept] api resolved');
      setInfo('Booking confirmed and added to My Jobs. The customer was notified.');
      await load();
      console.log('[accept] reloaded');
    } catch (err) {
      console.log('[accept] error', err instanceof Error ? err.message : String(err));
      setError(err instanceof ApiError ? err.message : 'Could not accept.');
    } finally {
      setActingId(null);
    }
  }

  function startReject(bookingId: string) {
    setRejectingId(bookingId);
    setRejectReason('');
    setError(null);
  }

  async function confirmReject(bookingId: string) {
    if (!rejectReason.trim()) {
      setError('A reason is required to reject a request.');
      return;
    }
    setActingId(bookingId);
    setError(null);
    try {
      await updateBookingStatus(bookingId, 'REJECTED', rejectReason.trim());
      setInfo('Request rejected. The customer was notified.');
      setRejectingId(null);
      setRejectReason('');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not reject.');
    } finally {
      setActingId(null);
    }
  }

  if (loading) {
    return (
      <Screen>
        <LoadingIndicator message="Loading requests…" />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView>
        {!approved ? (
          <EmptyState
            title="Requests locked"
            message="Only approved professionals receive booking requests."
          />
        ) : null}
        <SuccessMessage message={info} />
        <ErrorMessage message={error} />
        {approved && items.length === 0 && !error ? (
          <EmptyState title="No new requests" message="New booking requests will appear here." />
        ) : null}
        {items.map((booking) => (
          <Card key={booking.id}>
            <Text className="text-[16px] font-bold text-slate-900">
              {booking.serviceName ?? 'Service'}
            </Text>
            <Text className="mt-1 text-sm text-slate-600">
              {new Date(booking.scheduledAt).toLocaleString()} • {booking.urgency}
            </Text>
            <Text className="text-sm text-slate-600" numberOfLines={2}>
              {booking.address}
            </Text>
            <Text className="mt-1 text-sm text-slate-600" numberOfLines={3}>
              {booking.problemDescription}
            </Text>
            {booking.photoUrls.length > 0 ? (
              <Text className="text-xs text-slate-400">
                {booking.photoUrls.length} problem photo(s) attached — open details to view.
              </Text>
            ) : null}
            <View className="mt-3 flex-row justify-between">
              <View className="w-[48%]">
                <PrimaryButton title="Reject" onPress={() => startReject(booking.id)} />
              </View>
              <View className="w-[48%]">
                <PrimaryButton
                  title={actingId === booking.id ? '…' : 'Accept!'}
                  onPress={() => accept(booking.id)}
                  loading={actingId === booking.id}
                />
              </View>
            </View>
            {rejectingId === booking.id ? (
              <View className="mt-2">
                <CustomInput
                  label="Rejection reason (required)"
                  value={rejectReason}
                  onChangeText={setRejectReason}
                  multiline
                  placeholder="Why are you declining this request?"
                />
                <View className="flex-row gap-2">
                  <View className="flex-1">
                    <SecondaryButton title="Cancel" onPress={() => setRejectingId(null)} />
                  </View>
                  <View className="flex-1">
                    <PrimaryButton
                      title="Confirm Reject"
                      onPress={() => confirmReject(booking.id)}
                      loading={actingId === booking.id}
                    />
                  </View>
                </View>
              </View>
            ) : null}
            <PrimaryButton
              title="View Details"
              onPress={() => router.push({ pathname: '/(provider)/job', params: { id: booking.id } })}
            />
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}
