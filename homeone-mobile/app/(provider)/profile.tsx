import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ApiError } from '../../src/services/api';
import {
  getMyProvider,
  updateProviderInfo,
} from '../../src/services/providerService';
import { LANGUAGES, type ProviderProfile } from '../../src/types';
import { Chip } from '../../src/components/auth';
import {
  Card,
  CustomInput,
  ErrorMessage,
  LinkButton,
  LoadingIndicator,
  PrimaryButton,
  Screen,
  SuccessMessage,
} from '../../src/components/common';
import { useAuthStore } from '../../src/store/authStore';

export default function ProviderProfile() {
  const signOut = useAuthStore((s) => s.signOut);
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [businessAddress, setBusinessAddress] = useState('');
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [languages, setLanguages] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      setError(null);
      const data = await getMyProvider();
      setProfile(data);
      setBusinessAddress(data.businessAddress);
      setYearsOfExperience(String(data.yearsOfExperience));
      setLanguages(data.languagesSpoken);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load the profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  async function onSave() {
    setError(null);
    setInfo(null);
    const years = Number(yearsOfExperience || 0);
    if (!Number.isInteger(years) || years < 0 || years > 70) {
      setError('Years of experience must be a whole number between 0 and 70.');
      return;
    }
    if (businessAddress.trim().length < 5) {
      setError('Business address must be at least 5 characters.');
      return;
    }
    if (!languages.length) {
      setError('Select at least one language.');
      return;
    }
    setSaving(true);
    try {
      const updated = await updateProviderInfo({
        businessAddress: businessAddress.trim(),
        yearsOfExperience: years,
        languagesSpoken: languages,
      });
      setProfile(updated);
      setInfo('Profile updated. Verification-sensitive changes may return you to review.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  async function onSignOut() {
    await signOut();
    router.replace('/intro');
  }

  if (loading) {
    return (
      <Screen>
        <LoadingIndicator message="Loading profile…" />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView keyboardShouldPersistTaps="handled">
        <ErrorMessage message={error} />
        <Card>
          <Text className="mb-1 text-base font-bold text-slate-900">Business Details</Text>
          {profile ? (
            <Text className="mb-2 text-xs text-slate-400">
              Domain: {profile.domainName ?? '—'} • Status: {profile.verificationStatus}
            </Text>
          ) : null}
          <CustomInput
            label="Business Address"
            value={businessAddress}
            onChangeText={setBusinessAddress}
            multiline
          />
          <CustomInput
            label="Years of Experience"
            value={yearsOfExperience}
            onChangeText={setYearsOfExperience}
            keyboardType="number-pad"
          />
          <Text className="mb-2 text-[13px] font-semibold text-slate-900">Languages Spoken</Text>
          <View className="mb-3 flex-row flex-wrap">
            {LANGUAGES.map((language) => (
              <Chip
                key={language}
                label={language}
                selected={languages.includes(language)}
                onPress={() =>
                  setLanguages((prev) =>
                    prev.includes(language)
                      ? prev.filter((l) => l !== language)
                      : [...prev, language],
                  )
                }
              />
            ))}
          </View>
          <PrimaryButton title="Save Changes" onPress={onSave} loading={saving} />
          <SuccessMessage message={info} />
        </Card>

        <Card>
          <Text className="mb-1 text-base font-bold text-slate-900">Availability & Hours</Text>
          <Text className="mb-3 text-sm text-slate-500">
            Manage online status, working days and times.
          </Text>
          <PrimaryButton title="Manage Availability" onPress={() => router.push('/(provider)/availability')} />
          <PrimaryButton
            title="Verification Status"
            onPress={() => router.push('/(provider)/verification-status')}
          />
          <PrimaryButton
            title="Notifications"
            onPress={() => router.push('/(provider)/notifications')}
          />
        </Card>

        <LinkButton title="Logout" onPress={onSignOut} />
      </ScrollView>
    </Screen>
  );
}
