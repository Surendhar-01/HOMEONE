import { api, apiUpload, fileNameFromUri, guessMimeType } from './api';

export interface Review {
  id: string;
  bookingId: string;
  providerId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  photoUrls: string[];
}

export async function createReview(input: {
  bookingId: string;
  rating: number;
  comment?: string;
}): Promise<Review> {
  return api<Review>('/reviews', { method: 'POST', data: input });
}

export async function uploadReviewPhotos(reviewId: string, uris: string[]): Promise<Review> {
  return apiUpload<Review>(
    `/reviews/${reviewId}/photos`,
    {},
    uris.map((uri, index) => ({
      field: 'files',
      uri,
      name: fileNameFromUri(uri, `review-${index}.jpg`),
      mimeType: guessMimeType(uri),
    })),
  );
}

export async function listMyReviews(): Promise<Review[]> {
  return api<Review[]>('/reviews/mine');
}
