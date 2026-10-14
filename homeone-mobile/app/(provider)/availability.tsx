import { useCallback, useState } from 'react';
import { ScrollView, Switch, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ApiError } from '../../src/services/api';
import {
  getMyProvider,
  setAvailability,
  updateWorkingHours,
} from '../../src/services/providerService';
import { DAYS_OF_WEEK, type ProviderProfile } from '../../src/types';
import { Chip } from '../../src/components/auth';
import {
  Card,
  CustomInput,
  ErrorMessage,
  LoadingIndicator,
  PrimaryButton,
  Screen,
  SuccessMessage,
} from '../../src/components/common';

export default function Availability() {
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [online, setOnline] = useState(true);
  const [days, setDays] = useState<number[]>([]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await getMyProvider();
      setProfile(data);
      setOnline(data.isOnline);
      if (data.workingHours.length) {
        setDays(data.workingHours.map((h) => h.day_of_week));
        setStartTime(data.workingHours[0].start_time);
        setEndTime(data.workingHours[0].end_time);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load availability.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function onToggleOnline(value: boolean) {
    try {
      const updated = await setAvailability(value);
      setProfile(updated);
      setOnline(updated.isOnline);
      setInfo(value ? 'You are now online and visible for new requests.' : 'You are now offline.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not update status.');
    }
  }

  async function onSaveHours() {
    setError(null);
    setInfo(null);
    if (!days.length) {
      setError('Select at least one working day.');
      return;
    }
    if (!/^([01]\d|2[0-3]):([0-5]\d)$/.test(startTime) || !/^([01]\d|2[0-3]):([0-5]\d)$/.test(endTime)) {
      setError('Times must use 24-hour HH:mm format.');
      return;
    }
    if (startTime >= endTime) {
      setError('End time must be later than start time.');
      return;
    }
    setSaving(true);
    try {
      await updateWorkingHours(days.map((dayOfWeek) => ({ dayOfWeek, startTime, endTime })));
      setInfo('Working hours saved.');
      await load();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save working hours.');
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <Screen>
        <LoadingIndicator message="Loading availability…" />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView>
        <Card>
          <View className="flex-row items-center justify-between">
            <View className="flex-1">
              <Text className="text-base font-bold text-slate-900">Online Status</Text>
              <Text className="text-sm text-slate-500">
                {online ? 'Visible for new booking requests.' : 'Hidden from new requests.'}
              </Text>
            </View>
            <Switch value={online} onValueChange={onToggleOnline} />
          </View>
        </Card>

        <Card>
          <Text className="mb-2 text-base font-bold text-slate-900">Working Days</Text>
          <View className="mb-3 flex-row flex-wrap">
            {DAYS_OF_WEEK.map((d) => (
              <Chip
                key={d.value}
                label={d.label}
                selected={days.includes(d.value)}
                onPress={() =>
                  setDays((prev) =>
                    prev.includes(d.value)
                      ? prev.filter((x) => x !== d.value)
                      : [...prev, d.value].sort(),
                  )
                }
              />
            ))}
          </View>
          <View className="flex-row gap-3">
            <View className="flex-1">
              <CustomInput label="Start (HH:mm)" value={startTime} onChangeText={setStartTime} placeholder="09:00" />
            </View>
            <View className="flex-1">
              <CustomInput label="End (HH:mm)" value={endTime} onChangeText={setEndTime} placeholder="18:00" />
            </View>
          </View>
          <PrimaryButton title="Save Availability" onPress={onSaveHours} loading={saving} />
          <SuccessMessage message={info} />
          <ErrorMessage message={error} />
        </Card>
      </ScrollView>
    </Screen>
  );
}
