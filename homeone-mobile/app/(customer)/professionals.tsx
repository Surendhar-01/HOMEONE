import { useCallback, useEffect, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Location from 'expo-location';
import MapView, { Marker } from 'react-native-maps';
import { ApiError } from '../../src/services/api';
import {
  discoverProfessionals,
  type ProfessionalCard,
} from '../../src/services/discoveryService';
import {
  Card,
  EmptyState,
  ErrorMessage,
  LoadingIndicator,
  Screen,
} from '../../src/components/common';

type ViewMode = 'list' | 'map';

export default function Professionals() {
  const { serviceId, serviceName } = useLocalSearchParams<{ serviceId: string; serviceName?: string }>();
  const [items, setItems] = useState<ProfessionalCard[]>([]);
  const [mode, setMode] = useState<ViewMode>('list');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(
    async (latitude?: number, longitude?: number) => {
      if (!serviceId) {
        setError('No service selected.');
        setLoading(false);
        return;
      }
      try {
        setError(null);
        setItems(await discoverProfessionals({ serviceId, latitude, longitude }));
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Could not load professionals.');
      } finally {
        setLoading(false);
      }
    },
    [serviceId],
  );

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync().catch(() => ({
        status: 'denied' as const,
      }));
      if (status === 'granted') {
        try {
          const position = await Location.getLastKnownPositionAsync({});
          if (position) {
            setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
            await load(position.coords.latitude, position.coords.longitude);
            return;
          }
        } catch {
          // Fall through to location-less discovery.
        }
      }
      await load();
    })();
  }, [load]);

  function openProfile(providerId: string) {
    router.push({
      pathname: '/(customer)/professional',
      params: { id: providerId, serviceId, serviceName: serviceName ?? '' },
    });
  }

  if (loading) {
    return (
      <Screen>
        <LoadingIndicator message="Finding verified professionals…" />
      </Screen>
    );
  }

  const mappable = items.filter((p) => p.latitude !== null && p.longitude !== null);
  const region = coords
    ? { latitude: coords.latitude, longitude: coords.longitude, latitudeDelta: 0.08, longitudeDelta: 0.08 }
    : mappable.length
      ? {
          latitude: mappable[0].latitude as number,
          longitude: mappable[0].longitude as number,
          latitudeDelta: 0.12,
          longitudeDelta: 0.12,
        }
      : { latitude: 12.9716, longitude: 77.5946, latitudeDelta: 0.5, longitudeDelta: 0.5 };

  return (
    <Screen>
      <View className="mb-3 flex-row rounded-xl bg-slate-100 p-1">
        {(['list', 'map'] as ViewMode[]).map((view) => (
          <Pressable
            key={view}
            onPress={() => setMode(view)}
            className={`flex-1 items-center rounded-lg py-2 ${mode === view ? 'bg-white shadow-sm' : ''}`}
          >
            <Text
              className={`text-sm font-bold ${mode === view ? 'text-blue-700' : 'text-slate-400'}`}
            >
              {view === 'list' ? '☰ List View' : '🗺 Map View'}
            </Text>
          </Pressable>
        ))}
      </View>

      <ErrorMessage message={error} />

      {mode === 'map' ? (
        <View className="mb-3 h-80 overflow-hidden rounded-2xl border border-slate-200">
          <MapView style={{ flex: 1 }} initialRegion={region} showsUserLocation>
            {mappable.map((pro) => (
              <Marker
                key={pro.providerId}
                coordinate={{ latitude: pro.latitude as number, longitude: pro.longitude as number }}
                title={pro.providerName}
                description={`${pro.domainName ?? ''} • ${pro.yearsOfExperience} yrs`}
                onCalloutPress={() => openProfile(pro.providerId)}
              />
            ))}
          </MapView>
          <Text className="bg-white px-2 py-1 text-center text-xs text-slate-400">
            Tap a pin callout to view the professional. Locations are approximate business areas.
          </Text>
        </View>
      ) : null}

      <ScrollView>
        {items.length === 0 && !error ? (
          <EmptyState
            title="No professionals found"
            message="No approved professionals offer this service yet. Try another service."
          />
        ) : null}
        {items.map((pro) => (
          <Card key={pro.providerId}>
            <View className="flex-row">
              <View className="mr-3 h-14 w-14 items-center justify-center overflow-hidden rounded-full bg-blue-50">
                <Text className="text-2xl">👷</Text>
              </View>
              <View className="flex-1">
                <View className="flex-row items-center">
                  <Text className="text-[16px] font-bold text-slate-900">{pro.providerName}</Text>
                  <Text className="ml-1.5 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-800">
                    ✓ Verified
                  </Text>
                </View>
                <Text className="text-[13px] text-slate-500">
                  {pro.domainName ?? ''} • {pro.yearsOfExperience} yrs exp
                </Text>
                <Text className="text-[13px] text-slate-500" numberOfLines={1}>
                  {pro.skills.join(', ')}
                </Text>
                <View className="mt-1 flex-row items-center">
                  <Text className="text-[13px] font-semibold text-amber-600">
                    {pro.averageRating !== null ? `★ ${pro.averageRating}` : '★ New'}
                  </Text>
                  <Text className="text-xs text-slate-400">
                    {' '}
                    ({pro.totalReviews} review{pro.totalReviews === 1 ? '' : 's'})
                  </Text>
                  {pro.distanceKm !== null ? (
                    <Text className="text-xs text-slate-400"> • {pro.distanceKm} km away</Text>
                  ) : null}
                  <Text className={`text-xs font-semibold ${pro.isOnline ? 'text-green-700' : 'text-slate-400'}`}>
                    {' '}
                    • {pro.isOnline ? 'Online' : 'Offline'}
                  </Text>
                </View>
              </View>
            </View>
            <Pressable
              onPress={() => openProfile(pro.providerId)}
              className="mt-3 items-center rounded-xl bg-blue-700 py-3 active:bg-blue-800"
            >
              <Text className="text-sm font-bold text-white">View Profile</Text>
            </Pressable>
          </Card>
        ))}
      </ScrollView>
    </Screen>
  );
}

export function ProfessionalAvatar({ uri }: { uri: string | null }) {
  if (!uri) return null;
  return <Image source={{ uri }} className="h-14 w-14 rounded-full" />;
}
