import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { ApiError } from '../../src/services/api';
import { listPendingProviders } from '../../src/services/adminService';
import { useAuthStore } from '../../src/store/authStore';
import type { PendingProvider } from '../../src/types';
import {
  Card,
  EmptyState,
  ErrorMessage,
  LinkButton,
  PrimaryButton,
  Screen,
} from '../../src/components/common';

function StatCard({ label, value }: { label: string; value: number | string }) {
  return (
    <View className="mb-3 w-[48%] rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <Text className="text-2xl font-extrabold text-blue-700">{value}</Text>
      <Text className="mt-1 text-[13px] font-semibold text-slate-600">{label}</Text>
    </View>
  );
}

export default function AdminDashboard() {
  const principal = useAuthStore((s) => s.principal);
  const signOut = useAuthStore((s) => s.signOut);
  const [items, setItems] = useState<PendingProvider[]>([]);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await listPendingProviders();
      setItems(data.items);
      setTotal(data.total);
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Could not load providers. The backend may be unavailable.',
      );
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSignOut() {
    await signOut();
    router.replace('/intro');
  }

  return (
    <Screen>
      <ScrollView
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={load} />}
      >
        <Text className="text-sm text-slate-500">Welcome Admin,</Text>
        <Text className="mb-4 text-xl font-bold text-slate-900">
          {principal?.fullName ?? principal?.email ?? 'Administrator'}
        </Text>

        <Text className="mb-2 text-base font-bold text-slate-900">HomeOne Admin Dashboard</Text>
        <View className="flex-row flex-wrap justify-between">
          <StatCard label="Pending Verification" value={total} />
          <StatCard label="Approved Providers" value="—" />
          <StatCard label="Rejected Providers" value="—" />
          <StatCard label="Blocked Providers" value="—" />
        </View>

        <Text className="mb-2 mt-2 text-base font-bold text-slate-900">
          Pending Provider Verification
        </Text>

        {error ? <ErrorMessage message={error} /> : null}

        {!error && items.length === 0 ? (
          <EmptyState
            title="No pending providers"
            message="New service provider applications will appear here for review."
          />
        ) : null}

        {items.map((item) => (
          <Card key={item.id}>
            <Text className="text-[16px] font-bold text-slate-900">
              {item.fullName ?? 'Unnamed provider'}
            </Text>
            <Text className="text-sm text-slate-600">{item.domainName ?? 'No domain'}</Text>
            <Text className="text-xs text-slate-400">
              {item.yearsOfExperience} yrs • {(item.languagesSpoken ?? []).join(', ')}
            </Text>
            <Text className="text-xs text-slate-400">{item.email ?? ''}</Text>
            <View className="mt-2">
              <PrimaryButton
                title="Review"
                onPress={() =>
                  router.push({ pathname: '/(admin)/provider', params: { id: item.id } })
                }
              />
            </View>
          </Card>
        ))}

        <LinkButton title="Logout" onPress={onSignOut} />
      </ScrollView>
    </Screen>
  );
}