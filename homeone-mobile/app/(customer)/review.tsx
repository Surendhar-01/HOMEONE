import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { ApiError } from '../../src/services/api';
import { createReview, uploadReviewPhotos } from '../../src/services/reviewService';
import {
  Card,
  CustomInput,
  ErrorMessage,
  Header,
  PrimaryButton,
  Screen,
  SuccessMessage,
} from '../../src/components/common';

export default function WriteReview() {
  const { bookingId } = useLocalSearchParams<{ bookingId: string }>();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  async function submit() {
    setError(null);
    setInfo(null);
    if (!bookingId) {
      setError('No booking selected.');
      return;
    }
    if (rating < 1 || rating > 5) {
      setError('Pick a rating from 1 to 5.');
      return;
    }
    setSubmitting(true);
    try {
      const review = await createReview({
        bookingId,
        rating,
        comment: comment.trim() || undefined,
      });
      if (photos.length) {
        await uploadReviewPhotos(review.id, photos).catch(() => null);
      }
      setInfo('Thanks! Your review was submitted.');
      setTimeout(() => router.back(), 1500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not submit the review.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Screen>
      <ScrollView keyboardShouldPersistTaps="handled">
        <Header title="Rate Service" subtitle="One review per completed booking." />
        <Card>
          <Text className="mb-2 text-[15px] font-bold text-slate-900">Your rating</Text>
          <View className="mb-3 flex-row justify-between">
            {[1, 2, 3, 4, 5].map((star) => (
              <Pressable key={star} onPress={() => setRating(star)} className="p-1">
                <Text className={`text-4xl ${star <= rating ? 'text-amber-500' : 'text-slate-300'}`}>
                  ★
                </Text>
              </Pressable>
            ))}
          </View>
          <CustomInput
            label="Review (optional)"
            value={comment}
            onChangeText={setComment}
            multiline
            placeholder="How was the service?"
          />
          <PrimaryButton
            title={photos.length ? `Photos (${photos.length}/3) – Change` : 'Add Photos (optional)'}
            onPress={pickPhotos}
          />
          <PrimaryButton title="Submit Review" onPress={submit} loading={submitting} />
          <SuccessMessage message={info} />
          <ErrorMessage message={error} />
        </Card>
      </ScrollView>
    </Screen>
  );
}
