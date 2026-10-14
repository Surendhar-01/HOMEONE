import { Platform } from 'react-native';

const defaultHost = Platform.OS === 'android' ? '10.0.2.2' : 'localhost';
export const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? `http://${defaultHost}:8081/api/v1`).replace(/\/$/, '');

type ApiEnvelope<T> = { success: boolean; data: T };

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
  accessToken?: string | null,
): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...options.headers,
    },
  });

  const payload = await response.json().catch(() => null) as ApiEnvelope<T> | { message?: string | string[] } | null;
  if (!response.ok) {
    const rawMessage = payload && 'message' in payload ? payload.message : undefined;
    const message = Array.isArray(rawMessage) ? rawMessage.join('\n') : rawMessage;
    throw new ApiError(message ?? `Request failed (${response.status})`, response.status);
  }

  if (payload && 'success' in payload && payload.success) return payload.data;
  return payload as T;
}

export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  userId: string;
  role: 'CUSTOMER' | 'PROFESSIONAL' | 'ADMIN' | null;
  emailVerified: boolean;
  mobileVerified: boolean;
};
