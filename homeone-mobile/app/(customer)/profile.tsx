import { useCallback, useEffect, useState } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ApiError } from '../../src/services/api';
import {
  getProfile,
  removeProfilePhoto,
  updateProfile,
  uploadProfilePhoto,
} from '../../src/services/authService';
import type { Profile } from '../../src/types';
import {
  Card,
  CustomInput,
  ErrorMessage,
  Header,
  LoadingIndicator,
  PhoneInput,
  PrimaryButton,
  Screen,
  SuccessMessage,
} from '../../src/components/common';

export default function CustomerProfile() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getProfile();
      setProfile(data);
      setFullName(data.fullName);
      setMobileNumber(data.mobileNumber ?? '');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load the profile.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function onSave() {
    setError(null);
    setInfo(null);
    if (fullName.trim().length < 2) {
      setError('Full name must be at least 2 characters.');
      return;
    }
    setSaving(true);
    try {
      const data = await updateProfile({
        fullName: fullName.trim(),
        mobileNumber: mobileNumber.trim(),
      });
      setProfile(data);
      setInfo('Profile updated.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Update failed.');
    } finally {
      setSaving(false);
    }
  }

  async function onPickPhoto() {
    setError(null);
    setInfo(null);
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library permission is required to choose a picture.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    setUploading(true);
    try {
      const data = await uploadProfilePhoto(result.assets[0].uri);
      setProfile(data);
      setInfo('Profile photo updated.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Photo upload failed.');
    } finally {
      setUploading(false);
    }
  }

  async function onRemovePhoto() {
    setError(null);
    setInfo(null);
    try {
      const data = await removeProfilePhoto();
      setProfile(data);
      setInfo('Profile photo removed.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not remove the photo.');
    }
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
        <Header title="My Profile" />
        <Card>
          <View className="mb-3 items-center">
            {profile?.profilePhotoUrl ? (
              <Image
                source={{ uri: profile.profilePhotoUrl }}
                className="h-36 w-36 rounded-full"
              />
            ) : (
              <View className="h-36 w-36 items-center justify-center rounded-full bg-slate-100">
                <Text className="text-slate-400">No photo</Text>
              </View>
            )}
          </View>
          <Text className="text-center text-sm text-slate-500">{profile?.email}</Text>
          <Text className="text-center text-xs text-slate-400">
            {profile?.role} • Email {profile?.isEmailVerified ? 'verified' : 'not verified'}
          </Text>
          <PrimaryButton
            title={uploading ? 'Uploading…' : 'Choose Profile Photo'}
            onPress={onPickPhoto}
            loading={uploading}
          />
          {profile?.profilePhotoUrl ? (
            <PrimaryButton title="Remove Photo" onPress={onRemovePhoto} />
          ) : null}
        </Card>
        <Card>
          <CustomInput label="Full Name" value={fullName} onChangeText={setFullName} />
          <PhoneInput label="Mobile Number" value={mobileNumber} onChangeText={setMobileNumber} />
          <PrimaryButton title="Save Changes" onPress={onSave} loading={saving} />
          <SuccessMessage message={info} />
          <ErrorMessage message={error} />
        </Card>
      </ScrollView>
    </Screen>
  );
}