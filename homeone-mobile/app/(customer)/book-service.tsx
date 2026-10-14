import { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { ApiError } from '../../src/services/api';
import { createBooking, uploadBookingPhotos } from '../../src/services/bookingService';
import { listHomes } from '../../src/services/customerService';
import { getProfessionalProfile } from '../../src/services/discoveryService';
import type { CustomerHome } from '../../src/types';
import {
  Card,
  CustomInput,
  ErrorMessage,
  Header,
  PrimaryButton,
  Screen,
  SecondaryButton,
  SuccessMessage,
} from '../../src/components/common';
import { Chip } from '../../src/components/auth';
import { RegistrationProgress } from '../../src/components/auth';

const STEPS = ['Service', 'Home', 'Schedule', 'Details', 'Review'];

function newIdempotencyKey(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}-${Math.random().toString(36).slice(2)}`;
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export default function BookService() {
  const { providerId, serviceId, serviceName } = useLocalSearchParams<{
    providerId: string;
    serviceId?: string;
    serviceName?: string;
  }>();

  const [step, setStep] = useState(0);
  const [providerName, setProviderName] = useState('');
  const [homes, setHomes] = useState<CustomerHome[]>([]);
  const [homeId, setHomeId] = useState<string | null>(null);
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [date, setDate] = useState('');
  const [time, setTime] = useState('10:00');
  const [problem, setProblem] = useState('');
  const [urgency, setUrgency] = useState<'NORMAL' | 'HIGH' | 'URGENT'>('NORMAL');
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!providerId) {
      setError('No professional selected. Go back and choose one first.');
      return;
    }
    getProfessionalProfile(providerId)
      .then((profile) => setProviderName(profile.providerName))
      .catch(() => null);
    listHomes()
      .then((list) => {
        setHomes(list);
        const def = list.find((h) => h.isDefault) ?? list[0];
        if (def) {
          setHomeId(def.id);
          setAddress(def.address);
          if (def.latitude !== null && def.longitude !== null) {
            setCoords({ latitude: def.latitude, longitude: def.longitude });
          }
        }
      })
      .catch(() => null);
    const tomorrow = new Date(Date.now() + 86400000);
    setDate(toISODate(tomorrow));
  }, [providerId]);

  async function useLiveLocation() {
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission was denied.');
        return;
      }
      const position = await Location.getCurrentPositionAsync({});
      setCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
    } catch {
      setError('Could not get a GPS fix.');
    } finally {
      setLocating(false);
    }
  }

  async function pickPhotos() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library permission is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: true,
      selectionLimit: 3,
      quality: 0.8,
    });
    if (!result.canceled) {
      setPhotos(result.assets.map((a) => a.uri).slice(0, 3));
    }
  }

  function validateStep(current: number): string | null {
    if (current === 0) {
      if (!serviceId) return 'No service selected. Go back and pick a service first.';
      if (!providerId) return 'No professional selected.';
      return null;
    }
    if (current === 1) {
      if (address.trim().length < 5) return 'Service address must be at least 5 characters.';
      return null;
    }
    if (current === 2) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'Date must be YYYY-MM-DD.';
      if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(time)) return 'Time must be HH:mm (24-hour).';
      const scheduled = new Date(`${date}T${time}:00`);
      if (Number.isNaN(scheduled.getTime())) return 'Invalid date or time.';
      if (scheduled.getTime() <= Date.now() + 3600000) {
        return 'Schedule at least an hour in the future.';
      }
      return null;
    }
    if (current === 3) {
      if (problem.trim().length < 10) return 'Describe the problem in at least 10 characters.';
      return null;
    }
    return null;
  }

  function next() {
    setError(null);
    const stepError = validateStep(step);
    if (stepError) {
      setError(stepError);
      return;
    }
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  async function confirm() {
    setError(null);
    setInfo(null);
    const scheduled = new Date(`${date}T${time}:00`);
    setSubmitting(true);
    try {
      const booking = await createBooking({
        serviceId: serviceId as string,
        providerId: providerId as string,
        homeId: homeId ?? undefined,
        address: address.trim(),
        ...(coords ? { latitude: coords.latitude, longitude: coords.longitude } : {}),
        scheduledAt: scheduled.toISOString(),
        problemDescription: problem.trim(),
        urgency,
        idempotencyKey: newIdempotencyKey(),
      });
      if (photos.length) {
        await uploadBookingPhotos(booking.id, photos).catch(() => null);
      }
      Alert.alert('Booking requested', `Your booking ID is ${booking.id.slice(0, 8)}.`, [
        { text: 'Track Booking', onPress: () => router.replace({ pathname: '/(customer)/booking', params: { id: booking.id } }) },
      ]);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Booking failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
        <Header title="Book Service" subtitle="Review each step, then confirm your request." />
        <RegistrationProgress current={step} total={STEPS.length} labels={STEPS} />
        <ErrorMessage message={error} />
        <SuccessMessage message={info} />

        {step === 0 ? (
          <Card>
            <Text className="mb-1 text-[13px] font-semibold text-slate-500">Service</Text>
            <Text className="mb-3 text-lg font-bold text-slate-900">
              {(serviceName as string) ?? 'Selected service'}
            </Text>
            <Text className="mb-1 text-[13px] font-semibold text-slate-500">Professional</Text>
            <Text className="text-lg font-bold text-slate-900">{providerName || '…'}</Text>
          </Card>
        ) : null}

        {step === 1 ? (
          <Card>
            <Text className="mb-2 text-[15px] font-bold text-slate-900">Service Address</Text>
            {homes.map((home) => (
              <Chip
                key={home.id}
                label={`${home.label ?? 'Home'}: ${home.address.slice(0, 40)}`}
                selected={homeId === home.id}
                onPress={() => {
                  setHomeId(home.id);
                  setAddress(home.address);
                  if (home.latitude !== null && home.longitude !== null) {
                    setCoords({ latitude: home.latitude, longitude: home.longitude });
                  }
                }}
              />
            ))}
            <View className="mt-2 flex-row flex-wrap" />
            <PrimaryButton
              title={locating ? 'Locating…' : 'Use My Current Location'}
              onPress={useLiveLocation}
              loading={locating}
            />
            {coords ? (
              <Text className="mb-2 text-xs text-slate-500">
                GPS: {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
              </Text>
            ) : null}
            <CustomInput label="Address" value={address} onChangeText={setAddress} multiline />
          </Card>
        ) : null}

        {step === 2 ? (
          <Card>
            <CustomInput label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} placeholder="2026-12-01" />
            <CustomInput label="Time, 24-hour (HH:mm)" value={time} onChangeText={setTime} placeholder="10:00" />
            <View className="flex-row flex-wrap">
              {['09:00', '12:00', '15:00', '18:00'].map((slot) => (
                <Chip key={slot} label={slot} selected={time === slot} onPress={() => setTime(slot)} />
              ))}
            </View>
          </Card>
        ) : null}

        {step === 3 ? (
          <Card>
            <CustomInput
              label="Problem Description"
              value={problem}
              onChangeText={setProblem}
              multiline
              placeholder="Describe the issue in detail (min 10 characters)…"
            />
            <Text className="mb-2 text-[13px] font-semibold text-slate-900">Urgency</Text>
            <View className="mb-3 flex-row flex-wrap">
              {(['NORMAL', 'HIGH', 'URGENT'] as const).map((level) => (
                <Chip key={level} label={level} selected={urgency === level} onPress={() => setUrgency(level)} />
              ))}
            </View>
            <PrimaryButton
              title={photos.length ? `Photos (${photos.length}/3) – Add More` : 'Add Problem Photos (optional)'}
              onPress={pickPhotos}
            />
          </Card>
        ) : null}

        {step === 4 ? (
          <Card>
            <Text className="mb-2 text-base font-bold text-slate-900">Booking Summary</Text>
            <SummaryRow label="Service" value={(serviceName as string) ?? ''} />
            <SummaryRow label="Professional" value={providerName} />
            <SummaryRow label="Address" value={address} />
            <SummaryRow label="Scheduled" value={`${date} at ${time}`} />
            <SummaryRow label="Urgency" value={urgency} />
            <SummaryRow label="Problem" value={problem} />
            <SummaryRow label="Photos" value={photos.length ? `${photos.length} attached` : 'None'} />
          </Card>
        ) : null}

        <View className="mt-2 flex-row gap-3">
          {step > 0 ? (
            <View className="flex-1">
              <SecondaryButton title="Back" onPress={() => setStep((s) => s - 1)} />
            </View>
          ) : null}
          <View className="flex-1">
            {step < STEPS.length - 1 ? (
              <PrimaryButton title="Next" onPress={next} />
            ) : (
              <PrimaryButton title="Confirm Booking" onPress={confirm} loading={submitting} />
            )}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-2 flex-row justify-between border-b border-slate-100 pb-2">
      <Text className="text-[13px] font-semibold text-slate-500">{label}</Text>
      <Text className="ml-4 flex-1 text-right text-sm text-slate-900">{value}</Text>
    </View>
  );
}

