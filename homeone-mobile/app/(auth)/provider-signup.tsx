import { useEffect, useState } from 'react';
import { Alert, ScrollView, Switch, Text, View } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import { ApiError } from '../../src/services/api';
import {
  listServiceDomains,
  listServices,
  registerProvider,
} from '../../src/services/providerService';
import {
  Card,
  CustomInput,
  ErrorMessage,
  Header,
  LinkButton,
  PasswordInput,
  PhoneInput,
  PrimaryButton,
  Screen,
  SecondaryButton,
  SuccessMessage,
} from '../../src/components/common';
import { Chip, FileUploadField, RegistrationProgress } from '../../src/components/auth';
import type { ServiceDomain, ServiceItem, WorkingHour } from '../../src/types';
import { DAYS_OF_WEEK, LANGUAGES } from '../../src/types';
import {
  isValidEmail,
  isValidMobile,
  isValidTime,
  validatePassword,
} from '../../src/utils/validation';

const STEPS = ['Personal', 'Professional', 'Documents', 'Business', 'Review'];

type PickedFile = { uri: string; name: string; mimeType: string };

export default function ProviderSignup() {
  const [step, setStep] = useState(0);

  // Step 1 – personal
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<PickedFile | null>(null);

  // Step 2 – professional
  const [domains, setDomains] = useState<ServiceDomain[]>([]);
  const [domainName, setDomainName] = useState('');
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [yearsOfExperience, setYearsOfExperience] = useState('');
  const [languages, setLanguages] = useState<string[]>(['English']);

  // Step 3 – documents
  const [governmentId, setGovernmentId] = useState<PickedFile | null>(null);
  const [certificate, setCertificate] = useState<PickedFile | null>(null);
  const [noCertificate, setNoCertificate] = useState(false);
  const [workPhotos, setWorkPhotos] = useState<PickedFile[]>([]);

  // Step 4 – business
  const [businessAddress, setBusinessAddress] = useState('');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [days, setDays] = useState<number[]>([1, 2, 3, 4, 5, 6]);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('18:00');

  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    listServiceDomains()
      .then((list) => {
        setDomains(list);
        if (list.length) setDomainName((prev) => prev || list[0].domainName);
      })
      .catch(() => setError('Could not load service domains. Is the backend running?'));
  }, []);

  useEffect(() => {
    const domain = domains.find((d) => d.domainName === domainName);
    if (!domain) {
      setServices([]);
      return;
    }
    listServices(domain.id)
      .then((list) => {
        setServices(list);
        setSkills([]);
      })
      .catch(() => setError('Could not load services for the selected domain.'));
  }, [domainName, domains]);

  function toggle(list: string[], value: string, apply: (next: string[]) => void) {
    apply(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  async function pickImage(): Promise<PickedFile | null> {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setError('Photo library permission is required.');
      return null;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return null;
    const asset = result.assets[0];
    return {
      uri: asset.uri,
      name: asset.fileName ?? 'photo.jpg',
      mimeType: asset.mimeType ?? 'image/jpeg',
    };
  }

  async function pickDocument(): Promise<PickedFile | null> {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*', 'application/pdf'],
      copyToCacheDirectory: true,
    });
    if (result.canceled || !result.assets[0]) return null;
    const asset = result.assets[0];
    return { uri: asset.uri, name: asset.name, mimeType: asset.mimeType ?? 'application/pdf' };
  }

  async function useLiveLocation() {
    setError(null);
    setLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission was denied. Enter the business address manually.');
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
        if (readable) setBusinessAddress((prev) => prev || readable);
      }
      setInfo(`GPS fix: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}.`);
    } catch {
      setError('Could not get a GPS fix. Enter the business address manually.');
    } finally {
      setLocating(false);
    }
  }

  function validateStep(current: number): string | null {
    if (current === 0) {
      if (fullName.trim().length < 2) return 'Full name is required.';
      if (!isValidMobile(mobileNumber)) return 'Enter a valid mobile number.';
      if (!isValidEmail(email)) return 'Enter a valid email address.';
      const passwordError = validatePassword(password);
      if (passwordError) return passwordError;
      if (password !== confirmPassword) return 'Password and confirm password do not match.';
      return null;
    }
    if (current === 1) {
      if (!domainName) return 'Select a service domain.';
      if (!skills.length) return 'Select at least one skill or service.';
      const years = Number(yearsOfExperience || 0);
      if (!Number.isInteger(years) || years < 0 || years > 70) {
        return 'Years of experience must be a whole number between 0 and 70.';
      }
      if (!languages.length) return 'Select at least one language.';
      return null;
    }
    if (current === 2) {
      if (!governmentId) return 'A government ID document is required.';
      if (!noCertificate && !certificate) {
        return 'Upload a certificate or declare that none is available.';
      }
      if (!workPhotos.length) return 'Upload at least one work photo.';
      return null;
    }
    if (current === 3) {
      if (businessAddress.trim().length < 5) return 'Business address is required.';
      if (!days.length) return 'Select at least one working day.';
      if (!isValidTime(startTime) || !isValidTime(endTime)) {
        return 'Working times must use 24-hour HH:mm format.';
      }
      if (startTime >= endTime) return 'End time must be later than start time.';
      if (!agreedToTerms) return 'You must accept the Terms and Conditions.';
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

  async function submit() {
    // Documents upload right after this call on the documents screen; the
    // registration itself carries the profile, skills and working hours.
    setError(null);
    setLoading(true);
    try {
      const workingHours: WorkingHour[] = days.map((dayOfWeek) => ({
        dayOfWeek,
        startTime,
        endTime,
      }));
      await registerProvider({
        fullName: fullName.trim(),
        mobileNumber: mobileNumber.trim(),
        email: email.trim(),
        password,
        confirmPassword,
        domainName,
        skills,
        yearsOfExperience: Number(yearsOfExperience || 0),
        languagesSpoken: languages,
        businessAddress: businessAddress.trim(),
        ...(coords ? { latitude: coords.latitude, longitude: coords.longitude } : {}),
        workingHours,
        hasCertificate: !noCertificate,
        agreedToTerms: true,
      });
      router.push({
        pathname: '/(auth)/otp-verification',
        params: { email: email.trim(), role: 'PROFESSIONAL' },
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Registration failed. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <View className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ padding: 20 }} keyboardShouldPersistTaps="handled">
        <Header title="Join as Provider" subtitle="Complete each step to submit your application." />
        <RegistrationProgress current={step} total={STEPS.length} labels={STEPS} />
        <ErrorMessage message={error} />
        <SuccessMessage message={info} />

        {step === 0 ? (
          <View>
            <CustomInput label="Full Name" value={fullName} onChangeText={setFullName} placeholder="Ravi Kumar" />
            <PhoneInput label="Mobile Number" value={mobileNumber} onChangeText={setMobileNumber} />
            <CustomInput label="Email" value={email} onChangeText={setEmail} keyboardType="email-address" placeholder="you@example.com" />
            <PasswordInput label="Password" value={password} onChangeText={setPassword} />
            <PasswordInput label="Confirm Password" value={confirmPassword} onChangeText={setConfirmPassword} />
            <View className="mb-3 flex-row items-center justify-between">
              <Text className="text-sm font-semibold text-slate-900">Profile Photo (optional)</Text>
              <PrimaryButton
                title={profilePhoto ? 'Change' : 'Choose'}
                onPress={async () => {
                  const file = await pickImage();
                  if (file) setProfilePhoto(file);
                }}
              />
            </View>
            {profilePhoto ? <Text className="mb-3 text-xs text-slate-500">{profilePhoto.name}</Text> : null}
          </View>
        ) : null}

        {step === 1 ? (
          <View>
            <Text className="mb-2 text-[13px] font-semibold text-slate-900">Service Domain</Text>
            <View className="mb-3 flex-row flex-wrap">
              {domains.map((d) => (
                <Chip
                  key={d.id}
                  label={d.domainName}
                  selected={domainName === d.domainName}
                  onPress={() => setDomainName(d.domainName)}
                />
              ))}
            </View>
            <Text className="mb-2 text-[13px] font-semibold text-slate-900">Skills / Services</Text>
            <View className="mb-3 flex-row flex-wrap">
              {services.map((s) => (
                <Chip
                  key={s.id}
                  label={s.serviceName}
                  selected={skills.includes(s.serviceName)}
                  onPress={() => toggle(skills, s.serviceName, setSkills)}
                />
              ))}
            </View>
            <CustomInput
              label="Years of Experience"
              value={yearsOfExperience}
              onChangeText={setYearsOfExperience}
              keyboardType="number-pad"
              placeholder="0"
            />
            <Text className="mb-2 text-[13px] font-semibold text-slate-900">Languages Spoken</Text>
            <View className="mb-3 flex-row flex-wrap">
              {LANGUAGES.map((language) => (
                <Chip
                  key={language}
                  label={language}
                  selected={languages.includes(language)}
                  onPress={() => toggle(languages, language, setLanguages)}
                />
              ))}
            </View>
          </View>
        ) : null}

        {step === 2 ? (
          <View>
            <FileUploadField
              label="Government ID (image or PDF)"
              fileName={governmentId?.name ?? null}
              hint="Stored privately. Only you and admin reviewers can open it."
              onPress={async () => {
                const file = await pickDocument();
                if (file) setGovernmentId(file);
              }}
            />
            <View className="mb-3 flex-row items-center">
              <Switch value={noCertificate} onValueChange={setNoCertificate} />
              <Text className="ml-2.5 flex-1 text-sm text-slate-800">
                I have no certificate (manual review)
              </Text>
            </View>
            {!noCertificate ? (
              <FileUploadField
                label="Certificate (image or PDF)"
                fileName={certificate?.name ?? null}
                onPress={async () => {
                  const file = await pickDocument();
                  if (file) setCertificate(file);
                }}
              />
            ) : null}
            <FileUploadField
              label={`Work Photos (${workPhotos.length} selected)`}
              fileName={workPhotos.map((w) => w.name).join(', ') || null}
              hint="Up to 10 images. You can upload them right after registration too."
              onPress={async () => {
                const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
                if (!permission.granted) {
                  setError('Photo library permission is required.');
                  return;
                }
                const result = await ImagePicker.launchImageLibraryAsync({
                  mediaTypes: ['images'],
                  allowsMultipleSelection: true,
                  selectionLimit: 10,
                  quality: 0.8,
                });
                if (!result.canceled) {
                  setWorkPhotos(
                    result.assets.map((asset) => ({
                      uri: asset.uri,
                      name: asset.fileName ?? 'work.jpg',
                      mimeType: asset.mimeType ?? 'image/jpeg',
                    })),
                  );
                }
              }}
            />
            <Text className="text-xs text-slate-400">
              Note: documents are uploaded from the provider dashboard right after registration.
            </Text>
          </View>
        ) : null}

        {step === 3 ? (
          <View>
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
            <CustomInput
              label="Business Address"
              value={businessAddress}
              onChangeText={setBusinessAddress}
              multiline
              placeholder="Shop / street / area / city"
            />
            <Text className="mb-2 text-[13px] font-semibold text-slate-900">Working Days</Text>
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
            <View className="my-2 flex-row items-center">
              <Switch value={agreedToTerms} onValueChange={setAgreedToTerms} />
              <Text className="ml-2.5 flex-1 text-sm text-slate-800">
                I agree to the Terms and Conditions
              </Text>
            </View>
          </View>
        ) : null}

        {step === 4 ? (
          <View>
            <ReviewRow label="Full Name" value={fullName} />
            <ReviewRow label="Mobile" value={mobileNumber} />
            <ReviewRow label="Email" value={email} />
            <ReviewRow label="Domain" value={domainName} />
            <ReviewRow label="Skills" value={skills.join(', ')} />
            <ReviewRow label="Experience" value={`${yearsOfExperience || 0} years`} />
            <ReviewRow label="Languages" value={languages.join(', ')} />
            <ReviewRow label="Government ID" value={governmentId?.name ?? 'Missing'} />
            <ReviewRow
              label="Certificate"
              value={noCertificate ? 'None (manual review)' : (certificate?.name ?? 'Missing')}
            />
            <ReviewRow label="Work Photos" value={`${workPhotos.length} selected`} />
            <ReviewRow label="Business Address" value={businessAddress} />
            <ReviewRow label="Working Days" value={days.map((d) => DAYS_OF_WEEK[d].label).join(', ')} />
            <ReviewRow label="Working Time" value={`${startTime} – ${endTime}`} />
          </View>
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
              <PrimaryButton title="Submit Registration" onPress={submit} loading={loading} />
            )}
          </View>
        </View>
        <LinkButton title="Cancel" onPress={() => router.back()} />
      </ScrollView>
    </View>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <View className="mb-2 flex-row justify-between border-b border-slate-100 pb-2">
      <Text className="text-[13px] font-semibold text-slate-500">{label}</Text>
      <Text className="ml-4 flex-1 text-right text-sm text-slate-900">{value}</Text>
    </View>
  );
}

