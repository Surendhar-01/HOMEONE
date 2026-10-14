import { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, Switch, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ApiError } from '../../src/services/api';
import {
  getMyProvider,
  getMyRating,
  getVerificationStatus,
  setAvailability,
} from '../../src/services/providerService';
import { listBookings } from '../../src/services/bookingService';
import { useAuthStore } from '../../src/store/authStore';
import type { ProviderProfile, VerificationStatusInfo } from '../../src/types';
import { StatusCard } from '../../src/components/auth';
import {
  Card,
  EmptyState,
  ErrorMessage,
  LinkButton,
  LoadingIndicator,
  PrimaryButton,
  Screen,
} from '../../src/components/common';

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <View className="mb-3 w-[48%] rounded-2xl border border-slate-200 bg-white p-4">
      <Text className="text-2xl font-extrabold text-blue-700">{value}</Text>
      <Text className="mt-1 text-[13px] font-semibold text-slate-600">{label}</Text>
    </View>
  );
}

export default function ProviderDashboard() {
  const principal = useAuthStore((s) => s.principal);
  const signOut = useAuthStore((s) => s.signOut);
  const [status, setStatus] = useState<VerificationStatusInfo | null>(null);
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [rating, setRating] = useState<{ averageRating: number | null; totalReviews: number } | null>(null);
  const [counts, setCounts] = useState({ requested: 0, upcoming: 0, completed: 0 });
  const [toggling, setToggling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const statusInfo = await getVerificationStatus();
      setStatus(statusInfo);
      const provider = await getMyProvider().catch(() => null);
      setProfile(provider);
      if (provider && statusInfo.verificationStatus === 'APPROVED') {
        const [requested, active, done, ratingInfo] = await Promise.all([
          listBookings('REQUESTED').catch(() => ({ items: [], total: 0 })),
          listBookings().catch(() => ({ items: [], total: 0 })),
          listBookings('COMPLETED').catch(() => ({ items: [], total: 0 })),
          getMyRating(provider.id).catch(() => null),
        ]);
        const upcoming = active.items.filter((b) =>
          ['ACCEPTED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS'].includes(b.status),
        ).length;
        setCounts({ requested: requested.total, upcoming, completed: done.total });
        setRating(ratingInfo);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load the dashboard.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function onToggleOnline(value: boolean) {
    setToggling(true);
    try {
      const updated = await setAvailability(value);
      setProfile(updated);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update availability.');
    } finally {
      setToggling(false);
    }
  }

  async function onSignOut() {
    await signOut();
    router.replace('/intro');
  }

  if (loading) {
    return (
      <Screen>
        <LoadingIndicator message="Loading dashboard…" />
      </Screen>
    );
  }

  const approved = status?.verificationStatus === 'APPROVED';

  return (
    <Screen>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); void load(); }} />}
      >
        <View className="mb-4 flex-row items-center">
          <View className="mr-3 h-14 w-14 items-center justify-center rounded-full bg-blue-100">
            <Text className="text-2xl">👷</Text>
          </View>
          <View className="flex-1">
            <Text className="text-sm text-slate-500">Welcome back,</Text>
            <Text className="text-xl font-bold text-slate-900">
              {principal?.fullName ?? 'Provider'}
            </Text>
          </View>
          {approved && profile ? (
            <View className="items-center">
              <Switch value={profile.isOnline ?? true} onValueChange={onToggleOnline} disabled={toggling} />
              <Text className="text-xs font-semibold text-slate-500">
                {profile.isOnline ?? true ? 'Online' : 'Offline'}
              </Text>
            </View>
          ) : null}
        </View>

        {status ? (
          <StatusCard
            title={status.title}
            message={status.message}
            status={status.verificationStatus}
            reason={status.verificationReason}
          />
        ) : null}

        {!approved ? (
          <View>
            <EmptyState
              title="Dashboard locked"
              message={
                status?.verificationStatus === 'REJECTED'
                  ? 'Review the reason above. You can update your documents and details to resubmit for review.'
                  : status?.verificationStatus === 'BLOCKED'
                    ? 'Your account is blocked. Please contact support.'
                    : 'Your dashboard unlocks after admin approval.'
              }
            />
            <PrimaryButton
              title="Check Verification Status"
              onPress={() => router.push('/(provider)/verification-status')}
            />
          </View>
        ) : (
          <View>
            <View className="flex-row flex-wrap justify-between">
              <StatBox label="Pending Requests" value={counts.requested} />
              <StatBox label="Upcoming Jobs" value={counts.upcoming} />
              <StatBox label="Completed Jobs" value={counts.completed} />
              <StatBox
                label="Avg Rating"
                value={rating?.averageRating !== null && rating?.averageRating !== undefined ? `${rating.averageRating} ★` : '—'}
              />
            </View>
            <Card>
              <Text className="mb-1 text-base font-bold text-slate-900">Today</Text>
              <Text className="text-sm text-slate-500">
                {counts.requested} new request(s) waiting for your response.
              </Text>
              <PrimaryButton title="View Requests" onPress={() => router.push('/(provider)/requests')} />
              <PrimaryButton title="My Jobs" onPress={() => router.push('/(provider)/jobs')} />
            </Card>
          </View>
        )}

        <ErrorMessage message={error} />
        <LinkButton title="Logout" onPress={onSignOut} />
      </ScrollView>
    </Screen>
  );
}
