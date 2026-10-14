import { useCallback, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { ApiError } from '../../src/services/api';
import { listBookings } from '../../src/services/bookingService';
import { getMyProvider, getMyRating, getMyReviews, type ProviderReview } from '../../src/services/providerService';
import {
  Card,
  EmptyState,
  ErrorMessage,
  LoadingIndicator,
  Screen,
} from '../../src/components/common';

export default function Earnings() {
  const [completed, setCompleted] = useState(0);
  const [rating, setRating] = useState<{ averageRating: number | null; totalReviews: number } | null>(null);
  const [reviews, setReviews] = useState<ProviderReview[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setError(null);
      const provider = await getMyProvider();
      const [done, ratingInfo] = await Promise.all([
        listBookings('COMPLETED').catch(() => ({ items: [], total: 0 })),
        getMyRating(provider.id).catch(() => null),
      ]);
      setCompleted(done.total);
      setRating(ratingInfo);
      setReviews(await getMyReviews(provider.id).catch(() => []));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load earnings.');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      void load();
    }, [load]),
  );

  if (loading) {
    return (
      <Screen>
        <LoadingIndicator message="Loading earnings…" />
      </Screen>
    );
  }

  return (
    <Screen>
      <ScrollView>
        <ErrorMessage message={error} />
        <View className="flex-row flex-wrap justify-between">
          <View className="mb-3 w-[48%] rounded-2xl border border-slate-200 bg-white p-4">
            <Text className="text-2xl font-extrabold text-blue-700">{completed}</Text>
            <Text className="mt-1 text-[13px] font-semibold text-slate-600">Completed Jobs</Text>
          </View>
          <View className="mb-3 w-[48%] rounded-2xl border border-slate-200 bg-white p-4">
            <Text className="text-2xl font-extrabold text-blue-700">
              {rating?.averageRating !== null && rating?.averageRating !== undefined
                ? `${rating.averageRating} ★`
                : '—'}
            </Text>
            <Text className="mt-1 text-[13px] font-semibold text-slate-600">
              Avg Rating ({rating?.totalReviews ?? 0})
            </Text>
          </View>
        </View>

        <Card>
          <Text className="mb-1 text-base font-bold text-slate-900">Payments</Text>
          <Text className="text-sm text-slate-500">
            Payment and earnings tracking coming soon. Completed service counts above are real.
          </Text>
        </Card>

        <Text className="mb-2 mt-1 text-base font-bold text-slate-900">Customer Reviews</Text>
        {reviews.length === 0 ? (
          <EmptyState title="No reviews yet" message="Reviews from completed jobs appear here." />
        ) : (
          reviews.map((review) => (
            <Card key={review.id}>
              <Text className="text-sm font-bold text-amber-600">★ {review.rating}</Text>
              {review.comment ? (
                <Text className="mt-1 text-sm text-slate-600">{review.comment}</Text>
              ) : null}
              <Text className="mt-1 text-xs text-slate-400">
                {new Date(review.createdAt).toLocaleDateString()}
              </Text>
            </Card>
          ))
        )}
      </ScrollView>
    </Screen>
  );
}
