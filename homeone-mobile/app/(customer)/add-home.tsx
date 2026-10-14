import { useCallback, useEffect, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { ApiError } from '../../src/services/api';
import { createHome, deleteHome, listHomes } from '../../src/services/customerService';
import type { CustomerHome } from '../../src/types';
import {
  Card,
  CustomInput,
  EmptyState,
  ErrorMessage,
  Header,
  LoadingIndicator,
  PrimaryButton,
  Screen,
  SuccessMessage,
} from '../../src/components/common';

export default function AddHome() {
  const [address, setAddress] = useState('');
  const [label, setLabel] = useState('');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [homes, setHomes] = useState<CustomerHome[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setHomes(await listHomes());
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load addresses.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function useLiveLocation() {
    setError(null);
    setInfo(null);
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission was denied. Enter the address manually instead.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = position.coords;
      setCoords({ latitude, longitude });
      const [place] = await Location.reverseGeocodeAsync({ latitude, longitude }).catch(() => []);
      if (place) {
        const readable = [place.streetNumber, place.street, place.city, place.region, place.postalCode]
          .filter(Boolean)
          .join(', ');
        if (readable) setAddress((prev) => prev || readable);
      }
      setInfo(`GPS fix: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}. Confirm the address below.`);
    } catch {
      setError('Could not get a GPS fix. Enter the address manually instead.');
    } finally {
      setLocating(false);
    }
  }

  async function onSave() {
    setError(null);
    setInfo(null);
    if (address.trim().length < 5) {
      setError('Address must be at least 5 characters.');
      return;
    }
    setSaving(true);
    try {
      await createHome({
        address: address.trim(),
        label: label.trim() || undefined,
        ...(coords ? { latitude: coords.latitude, longitude: coords.longitude } : {}),
      });
      setAddress('');
      setLabel('');
      setCoords(null);
      await load();
      setInfo('Home address saved.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save the address.');
    } finally {
      setSaving(false);
    }
  }

  async function onRemove(id: string) {
    setError(null);
    try {
      await deleteHome(id);
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not remove the address.');
    }
  }

  return (
    <Screen>
      <ScrollView keyboardShouldPersistTaps="handled">
        <Header title="Add Home" subtitle="Get your live GPS fix, confirm the address, then save it." />
        <Card>
          <PrimaryButton
            title={locating ? 'Locating…' : 'Use My Current Location'}
            onPress={useLiveLocation}
            loading={locating}
          />
          <CustomInput label="Address" value={address} onChangeText={setAddress} multiline />
          <CustomInput label="Label (optional)" value={label} onChangeText={setLabel} placeholder="Home" />
          {coords ? (
            <Text className="mb-2 text-xs text-slate-500">
              GPS: {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
            </Text>
          ) : null}
          <PrimaryButton title="Save Address" onPress={onSave} loading={saving} />
          <SuccessMessage message={info} />
          <ErrorMessage message={error} />
        </Card>

        {loading ? (
          <LoadingIndicator message="Loading addresses…" />
        ) : homes.length === 0 ? (
          <EmptyState title="No saved addresses" message="Add your first home address above." />
        ) : (
          homes.map((home) => (
            <Card key={home.id}>
              <Text className="text-[15px] font-bold text-slate-900">
                {home.label ?? 'Address'}
                {home.isDefault ? ' • default' : ''}
              </Text>
              <Text className="mt-1 text-sm text-slate-600">{home.address}</Text>
              {home.latitude !== null && home.longitude !== null ? (
                <Text className="text-xs text-slate-400">
                  {home.latitude.toFixed(5)}, {home.longitude.toFixed(5)}
                </Text>
              ) : null}
              <View className="mt-2">
                <PrimaryButton title="Remove" onPress={() => onRemove(home.id)} />
              </View>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}