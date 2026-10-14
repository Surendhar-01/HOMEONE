import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ApiError } from '../../src/services/api';
import {
  listMainCategories,
  listServices,
  type MainCategory,
} from '../../src/services/discoveryService';
import type { ServiceItem } from '../../src/types';
import {
  Card,
  EmptyState,
  ErrorMessage,
  LoadingIndicator,
  Screen,
} from '../../src/components/common';
import { Chip } from '../../src/components/auth';

const RECENT_KEY = 'homeone.recentSearches';
const MAX_RECENT = 8;

async function loadRecent(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

async function saveRecent(term: string) {
  const clean = term.trim();
  if (!clean) return;
  const current = await loadRecent();
  const next = [clean, ...current.filter((t) => t.toLowerCase() !== clean.toLowerCase())].slice(
    0,
    MAX_RECENT,
  );
  await AsyncStorage.setItem(RECENT_KEY, JSON.stringify(next)).catch(() => null);
}

export default function Explore() {
  const params = useLocalSearchParams<{ q?: string }>();
  const [query, setQuery] = useState(typeof params.q === 'string' ? params.q : '');
  const [categories, setCategories] = useState<MainCategory[]>([]);
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);
  const [expandedDomain, setExpandedDomain] = useState<string | null>(null);
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loadingServices, setLoadingServices] = useState(false);
  const [recent, setRecent] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setError(null);
      setCategories(await listMainCategories());
      setRecent(await loadRecent());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load services.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      if (typeof params.q === 'string' && params.q !== query) {
        setQuery(params.q);
      }
    }, [params.q, query]),
  );

  async function openDomain(domainId: string) {
    if (expandedDomain === domainId) {
      setExpandedDomain(null);
      setServices([]);
      return;
    }
    setExpandedDomain(domainId);
    setLoadingServices(true);
    try {
      setServices(await listServices(domainId));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load services.');
      setServices([]);
    } finally {
      setLoadingServices(false);
    }
  }

  function openService(service: ServiceItem) {
    void saveRecent(service.serviceName);
    router.push({
      pathname: '/(customer)/professionals',
      params: { serviceId: service.id, serviceName: service.serviceName },
    });
  }

  function submitSearch() {
    const term = query.trim();
    if (!term) return;
    void saveRecent(term);
    const match = categories
      .flatMap((c) => c.domains.map((d) => ({ ...d, category: c.categoryName })))
      .find((d) => d.domainName.toLowerCase().includes(term.toLowerCase()));
    if (match) {
      const category = categories.find((c) => c.domains.some((d) => d.id === match.id));
      if (category) {
        setExpandedCategory(category.id);
        void openDomain(match.id);
        return;
      }
    }
    setError(`No matching service found for "${term}". Try "cleaning" or "electrical".`);
  }

  if (loading) {
    return (
      <Screen>
        <LoadingIndicator message="Loading services…" />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView keyboardShouldPersistTaps="handled">
        <View className="mb-4 flex-row items-center rounded-xl border border-slate-200 bg-slate-50 px-3">
          <Text className="mr-2 text-base">🔍</Text>
          <TextInput
            value={query}
            onChangeText={setQuery}
            onSubmitEditing={submitSearch}
            returnKeyType="search"
            placeholder="Search by service, domain or category…"
            placeholderTextColor="#94A3B8"
            className="flex-1 py-3 text-[15px] text-slate-900"
          />
          {query ? (
            <Pressable onPress={() => setQuery('')}>
              <Text className="px-2 text-sm font-bold text-slate-400">✕</Text>
            </Pressable>
          ) : null}
        </View>

        {recent.length > 0 ? (
          <View className="mb-3">
            <Text className="mb-2 text-[13px] font-semibold text-slate-500">Recent searches</Text>
            <View className="flex-row flex-wrap">
              {recent.map((term) => (
                <Chip
                  key={term}
                  label={term}
                  selected={false}
                  onPress={() => {
                    setQuery(term);
                    setExpandedCategory(null);
                  }}
                />
              ))}
            </View>
          </View>
        ) : null}

        <ErrorMessage message={error} />

        {categories.map((category) => (
          <Card key={category.id}>
            <Pressable
              onPress={() =>
                setExpandedCategory((prev) => (prev === category.id ? null : category.id))
              }
              className="flex-row items-center"
            >
              <Text className="mr-2 text-xl">{category.icon || '🔧'}</Text>
              <View className="flex-1">
                <Text className="text-[16px] font-bold text-slate-900">{category.categoryName}</Text>
                <Text className="text-xs text-slate-400">
                  {category.domains.length
                    ? `${category.domains.length} domain(s)`
                    : 'Coming soon'}
                </Text>
              </View>
              <Text className="text-lg text-slate-300">
                {expandedCategory === category.id ? '▴' : '▾'}
              </Text>
            </Pressable>

            {expandedCategory === category.id ? (
              <View className="mt-3">
                {category.domains.length === 0 ? (
                  <Text className="text-sm text-slate-500">
                    No domains here yet — check back soon.
                  </Text>
                ) : (
                  category.domains.map((domain) => (
                    <View key={domain.id} className="mb-1">
                      <Pressable
                        onPress={() => openDomain(domain.id)}
                        className="rounded-lg bg-slate-50 px-3 py-2.5"
                      >
                        <Text className="text-sm font-semibold text-blue-800">
                          {domain.domainName}
                        </Text>
                      </Pressable>
                      {expandedDomain === domain.id ? (
                        <View className="ml-3 mt-1">
                          {loadingServices ? (
                            <Text className="py-2 text-xs text-slate-400">Loading…</Text>
                          ) : services.length === 0 ? (
                            <Text className="py-2 text-xs text-slate-400">
                              No active services in this domain.
                            </Text>
                          ) : (
                            services.map((service) => (
                              <Pressable
                                key={service.id}
                                onPress={() => openService(service)}
                                className="border-b border-slate-100 py-2.5"
                              >
                                <Text className="text-sm text-slate-700">
                                  {service.serviceName} ›
                                </Text>
                              </Pressable>
                            ))
                          )}
                        </View>
                      ) : null}
                    </View>
                  ))
                )}
              </View>
            ) : null}
          </Card>
        ))}

        {categories.length === 0 && !error ? (
          <EmptyState title="No categories" message="The service catalog is unavailable." />
        ) : null}
      </ScrollView>
    </Screen>
  );
}
