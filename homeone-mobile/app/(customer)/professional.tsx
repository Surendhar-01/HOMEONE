import { useCallback, useEffect, useState } from 'react';
import { Image, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ApiError } from '../../src/services/api';
import {
  getProfessionalProfile,
  type ProfessionalProfile,
} from '../../src/services/discoveryService';
import { DAYS_OF_WEEK } from '../../src/types';
import {
  Card,
  ErrorMessage,
  LoadingIndicator,
  PrimaryButton,
  Screen,
} from '../../src/components/common';

const DAY_LABELS = new Map(DAYS_OF_WEEK.map((d) => [d.value, d.label]));

export default function ProfessionalDetail() {
  const { id, serviceId, serviceName } = useLocalSearchParams<{
    id: string;
    serviceId?: string;
    serviceName?: string;
  }>();
  const [profile, setProfile] = useState<ProfessionalProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!id) {
      setError('No professional selected.');
      setLoading(false);
      return;
    }
    try {
      setProfile(await getProfessionalProfile(id));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load the profile.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) {
    return (
      <Screen>
        <LoadingIndicator message="Loading profile…" />
      </Screen>
    );
  }

  if (!profile) {
    return (
      <Screen>
        <ErrorMessage message={error ?? 'Professional not found.'} />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView>
        <Card>
          <View className="items-center">
            {profile.profilePhotoUrl ? (
              <Image source={{ uri: profile.profilePhotoUrl }} className="h-24 w-24 rounded-full" />
            ) : (
              <View className="h-24 w-24 items-center justify-center rounded-full bg-blue-50">
                <Text className="text-4xl">👷</Text>
              </View>
            )}
            <View className="mt-2 flex-row items-center">
              <Text className="text-xl font-bold text-slate-900">{profile.providerName}</Text>
              <Text className="ml-2 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-bold text-green-800">
                ✓ Verified
              </Text>
            </View>
            <Text className="text-sm text-slate-500">{profile.domainName}</Text>
            <Text className="mt-1 text-sm font-semibold text-amber-600">
              {profile.averageRating !== null
                ? `★ ${profile.averageRating} (${profile.totalReviews} reviews)`
                : '★ No ratings yet'}
            </Text>
          </View>
        </Card>

        <Card>
          <Text className="mb-1 text-base font-bold text-slate-900">Services Offered</Text>
          {profile.skills.map((skill) => (
            <Text key={skill} className="text-sm text-slate-600">
              • {skill}
            </Text>
          ))}
          <Text className="mt-2 text-sm text-slate-600">
            Experience: {profile.yearsOfExperience} years
          </Text>
          <Text className="text-sm text-slate-600">
            Languages: {profile.languagesSpoken.join(', ') || '—'}
          </Text>
          <Text className="text-sm text-slate-600">
            Certificate: {profile.hasCertificate ? 'Verified on file' : 'Not provided (manual review)'}
          </Text>
        </Card>

        <Card>
          <Text className="mb-1 text-base font-bold text-slate-900">Working Days & Time</Text>
          {profile.workingHours.length === 0 ? (
            <Text className="text-sm text-slate-500">Not published.</Text>
          ) : (
            profile.workingHours.map((h, index) => (
              <Text key={index} className="text-sm text-slate-600">
                {DAY_LABELS.get(h.dayOfWeek) ?? `Day ${h.dayOfWeek}`}: {h.startTime} – {h.endTime}
              </Text>
            ))
          )}
          <Text className="mt-1 text-sm text-slate-600">Service area: {profile.businessAddress}</Text>
        </Card>

        {profile.workPhotoUrls.length > 0 ? (
          <Card>
            <Text className="mb-2 text-base font-bold text-slate-900">Work Photos</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {profile.workPhotoUrls.map((uri, index) => (
                <Image
                  key={index}
                  source={{ uri }}
                  className="mr-2 h-32 w-32 rounded-xl"
                />
              ))}
            </ScrollView>
          </Card>
        ) : null}

        <Card>
          <Text className="mb-2 text-base font-bold text-slate-900">
            Ratings & Reviews ({profile.totalReviews})
          </Text>
          {profile.reviews.length === 0 ? (
            <Text className="text-sm text-slate-500">No reviews yet.</Text>
          ) : (
            profile.reviews.map((review, index) => (
              <View key={index} className="mb-2 border-b border-slate-100 pb-2">
                <Text className="text-sm font-bold text-amber-600">★ {review.rating}</Text>
                {review.comment ? (
                  <Text className="text-sm text-slate-600">{review.comment}</Text>
                ) : null}
              </View>
            ))
          )}
        </Card>

        <ErrorMessage message={error} />
        <PrimaryButton
          title="Book Now"
          onPress={() =>
            router.push({
              pathname: '/(customer)/book-service',
              params: { providerId: profile.providerId, serviceId: serviceId ?? '', serviceName: serviceName ?? profile.skills[0] ?? '' },
            })
          }
        />
      </ScrollView>
    </Screen>
  );
}