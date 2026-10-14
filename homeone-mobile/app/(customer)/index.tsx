import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import { listHomes } from '../../src/services/customerService';
import type { CustomerHome } from '../../src/types';
import { CategoryCard } from '../../src/components/auth';
import { Card, EmptyState, LinkButton, PrimaryButton, Screen } from '../../src/components/common';

const QUICK_CATEGORIES = [
  { icon: '🔧', title: 'Repair & Maintenance' },
  { icon: '🧹', title: 'Cleaning & Hygiene' },
  { icon: '🏗️', title: 'Construction & Renovation' },
  { icon: '🔒', title: 'Security & Safety' },
];

export default function CustomerHome() {
  const principal = useAuthStore((s) => s.principal);
  const signOut = useAuthStore((s) => s.signOut);
  const [query, setQuery] = useState('');
  const [home, setHome] = useState<CustomerHome | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadHome = useCallback(async () => {
    try {
      const homes = await listHomes();
      setHome(homes.find((h) => h.isDefault) ?? homes[0] ?? null);
    } catch {
      setHome(null);
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadHome();
  }, [loadHome]);

  useFocusEffect(
    useCallback(() => {
      void loadHome();
    }, [loadHome]),
  );

  async function onSignOut() {
    await signOut();
    router.replace('/intro');
  }

  function goExplore(initialQuery = '') {
    router.push({
      pathname: '/(customer)/explore',
      params: initialQuery ? { q: initialQuery } : {},
    });
  }

  return (
    <Screen>
      <ScrollView
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadHome} />}
      >
        <View className="mb-4 flex-row items-center justify-between">
          <View>
            <Text className="text-sm text-slate-500">Welcome back,</Text>
            <Text className="text-xl font-bold text-slate-900">
              {principal?.fullName ?? 'Customer'}
            </Text>
          </View>
          <View className="h-11 w-11 items-center justify-center rounded-full bg-blue-100">
            <Text className="text-xl">👤</Text>
          </View>
        </View>

        <Card>
          <Text className="mb-1 text-[13px] font-semibold text-slate-500">Current Home</Text>
          {home ? (
            <View>
              <Text className="text-[15px] font-bold text-slate-900">
                {home.label ?? 'Home address'}
              </Text>
              <Text className="text-sm text-slate-600" numberOfLines={2}>
                {home.address}
              </Text>
            </View>
          ) : (
            <Text className="text-sm text-slate-500">No home address saved yet.</Text>
          )}
          <PrimaryButton
            title={home ? 'Change Home' : 'Add Home'}
            onPress={() => router.push('/(customer)/add-home')}
          />
        </Card>

        <View className="mb-4 flex-row items-center rounded-xl border border-slate-200 bg-slate-50 px-3">
          <Text className="mr-2 text-base">🔍</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={() => goExplore(query.trim())}
            returnKeyType="search"
            placeholder="Search services…"
            placeholderTextColor="#94A3B8"
            className="flex-1 py-3 text-[15px] text-slate-900"
          />
        </View>

        <Text className="mb-3 text-lg font-bold text-slate-900">What service do you need?</Text>

        <View className="flex-row flex-wrap justify-between">
          {QUICK_CATEGORIES.map((category) => (
            <CategoryCard
              key={category.title}
              icon={category.icon}
              title={category.title}
              onPress={() => goExplore(category.title)}
            />
          ))}
        </View>

        <PrimaryButton title="Explore All Services" onPress={() => goExplore()} />

        <Card>
          <Text className="mb-1 text-base font-bold text-slate-900">My Bookings</Text>
          <Text className="mb-3 text-sm text-slate-500">
            Track upcoming services and review completed work.
          </Text>
          <PrimaryButton title="View Bookings" onPress={() => router.push('/(customer)/bookings')} />
        </Card>

        <EmptyState
          title="Recent Activity"
          message="Your recent services will appear here."
        />
        <LinkButton title="Logout" onPress={onSignOut} />
      </ScrollView>
    </Screen>
  );
}