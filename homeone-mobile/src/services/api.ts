import { Platform } from 'react-native';
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig } from 'axios';
import { appStorage } from './storage';
import type { ApiEnvelope } from '../types';

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ??
  (Platform.OS === 'web' ? 'http://localhost:5000/api/v1' : 'http://10.0.2.2:5000/api/v1');

export const ACCESS_TOKEN_KEY = 'homeone.accessToken';
export const REFRESH_TOKEN_KEY = 'homeone.refreshToken';

export class ApiError extends Error {
  status: number;
  messages: string[];

  constructor(status: number, messages: string[]) {
    super(messages.join('\n'));
    this.status = status;
    this.messages = messages;
  }
}

function toMessages(payload: unknown, fallback: string): string[] {
  if (typeof payload === 'object' && payload !== null) {
    const message = (payload as { message?: unknown }).message;
    if (Array.isArray(message)) return message.map(String);
    if (typeof message === 'string') return [message];
  }
  return [fallback];
}

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) return error;
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError<unknown>;
    const status = axiosError.response?.status ?? 0;
    if (axiosError.code === 'ECONNABORTED') {
      return new ApiError(status, ['Request timed out. Please try again.']);
    }
    if (!axiosError.response) {
      return new ApiError(
        0,
        ['Cannot reach the server. Check that the backend is running and the API URL is correct.'],
      );
    }
    return new ApiError(status, toMessages(axiosError.response.data, `Request failed (${status})`));
  }
  return new ApiError(0, ['Something went wrong. Please try again.']);
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(toApiError(error)),
);

/** Typed GET/POST/PATCH/PUT/DELETE that unwraps the backend `{ success, data }` envelope. */
export async function api<T>(path: string, config: AxiosRequestConfig = {}): Promise<T> {
  const token = await appStorage.getItem(ACCESS_TOKEN_KEY);
  return apiWithToken<T>(path, token, config);
}

/** Same as `api()` but with an explicit token (used during hydration/refresh). */
export async function apiWithToken<T>(
  path: string,
  token: string | null,
  config: AxiosRequestConfig = {},
): Promise<T> {
  const response = await apiClient.request<ApiEnvelope<T>>({
    ...config,
    url: path,
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(config.headers ?? {}),
    },
  });
  const envelope = response.data;
  if (envelope && typeof envelope === 'object' && 'data' in envelope) {
    return (envelope as ApiEnvelope<T>).data;
  }
  return envelope as unknown as T;
}

/** Multipart upload (profile photo, documents, work photos). */
export async function apiUpload<T>(
  path: string,
  fields: Record<string, string | boolean | undefined>,
  files: { field: string; uri: string; name: string; mimeType: string }[],
): Promise<T> {
  const token = await appStorage.getItem(ACCESS_TOKEN_KEY);
  if (!token) throw new ApiError(401, ['Not signed in.']);

  const form = new FormData();
  for (const [key, value] of Object.entries(fields)) {
    if (value !== undefined) form.append(key, String(value));
  }
  for (const file of files) {
    form.append(file.field, {
      uri: file.uri,
      name: file.name,
      type: file.mimeType,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
  }

  const response = await apiClient.post<ApiEnvelope<T>>(path, form, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'multipart/form-data',
    },
    timeout: 120000,
  });
  const envelope = response.data;
  if (envelope && typeof envelope === 'object' && 'data' in envelope) {
    return (envelope as ApiEnvelope<T>).data;
  }
  return envelope as unknown as T;
}

export function guessMimeType(uri: string, fallback = 'image/jpeg'): string {
  const lower = uri.toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.pdf')) return 'application/pdf';
  if (lower.endsWith('.jpg') || lower.endsWith('.jpeg')) return 'image/jpeg';
  return fallback;
}

export function fileNameFromUri(uri: string, fallback: string): string {
  const last = uri.split('/').pop();
  if (last && last.includes('.')) return last;
  return fallback;
}
