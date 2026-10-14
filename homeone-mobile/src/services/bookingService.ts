import { api, apiUpload, fileNameFromUri, guessMimeType } from './api';

export type BookingStatus =
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'ON_THE_WAY'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED';

export interface Booking {
  id: string;
  customerId: string;
  providerId: string;
  serviceId: string;
  serviceName: string | null;
  providerName: string | null;
  homeId: string | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
  scheduledAt: string;
  problemDescription: string;
  urgency: string;
  status: BookingStatus;
  statusUpdatedAt: string;
  history: { oldStatus: string | null; newStatus: string; createdAt: string }[];
  photoUrls: string[];
  createdAt: string;
}

export interface CreateBookingInput {
  serviceId: string;
  providerId: string;
  homeId?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  scheduledAt: string;
  problemDescription: string;
  urgency?: 'NORMAL' | 'HIGH' | 'URGENT';
  idempotencyKey: string;
}

export async function createBooking(input: CreateBookingInput): Promise<Booking> {
  return api<Booking>('/bookings', { method: 'POST', data: input });
}

export async function listBookings(status?: BookingStatus): Promise<{ items: Booking[]; total: number }> {
  const query = status ? `?status=${status}` : '';
  const result = await api<{ items: Booking[]; total: number }>(`/bookings${query}`);
  return result;
}

export async function getBooking(bookingId: string): Promise<Booking> {
  return api<Booking>(`/bookings/${bookingId}`);
}

export async function updateBookingStatus(
  bookingId: string,
  status: BookingStatus,
  reason?: string,
): Promise<Booking> {
  return api<Booking>(`/bookings/${bookingId}/status`, {
    method: 'PATCH',
    data: { status, reason },
  });
}

export async function uploadBookingPhotos(bookingId: string, uris: string[]): Promise<Booking> {
  return apiUpload<Booking>(
    `/bookings/${bookingId}/photos`,
    {},
    uris.map((uri, index) => ({
      field: 'files',
      uri,
      name: fileNameFromUri(uri, `problem-${index}.jpg`),
      mimeType: guessMimeType(uri),
    })),
  );
}

export function bookingStatusLabel(status: BookingStatus): string {
  switch (status) {
    case 'REQUESTED': return 'Requested';
    case 'ACCEPTED': return 'Accepted';
    case 'REJECTED': return 'Rejected';
    case 'CANCELLED': return 'Cancelled';
    case 'ON_THE_WAY': return 'On the Way';
    case 'ARRIVED': return 'Arrived';
    case 'IN_PROGRESS': return 'In Progress';
    case 'COMPLETED': return 'Completed';
  }
}
