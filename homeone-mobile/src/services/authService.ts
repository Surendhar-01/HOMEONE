import { api, apiUpload, fileNameFromUri, guessMimeType } from './api';
import type { AuthSession, Profile } from '../types';

export interface RegisterProfileInput {
  fullName: string;
  mobileNumber: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreedToTerms: boolean;
  role?: 'CUSTOMER' | 'PROFESSIONAL';
}

export interface RegisterProfileResult {
  userId: string;
  email: string;
  role: string;
  otpSent: boolean;
  otpChannel: string;
  resendAvailableInSeconds?: number;
}

export async function registerProfile(input: RegisterProfileInput): Promise<RegisterProfileResult> {
  return api<RegisterProfileResult>('/auth/register-profile', {
    method: 'POST',
    data: input,
  });
}

export async function verifyOtp(email: string, otp: string): Promise<AuthSession> {
  return api<AuthSession>('/auth/verify-otp', {
    method: 'POST',
    data: { email, otp },
  });
}

export async function resendOtp(email: string): Promise<{ resendAvailableInSeconds: number }> {
  return api('/auth/resend-otp', { method: 'POST', data: { email } });
}

export async function login(
  identifier: string,
  password: string,
  expectedRole: 'CUSTOMER' | 'PROFESSIONAL' | 'ADMIN',
): Promise<AuthSession> {
  return api<AuthSession>('/auth/login', {
    method: 'POST',
    data: { identifier, password, expectedRole },
  });
}

export async function forgotPassword(email: string): Promise<{ message: string }> {
  return api('/auth/forgot-password', { method: 'POST', data: { email } });
}

export async function resetPassword(
  recoveryToken: string,
  password: string,
  confirmPassword: string,
): Promise<{ message: string }> {
  return api('/auth/reset-password', {
    method: 'POST',
    data: { recoveryToken, password, confirmPassword },
  });
}

export async function getProfile(): Promise<Profile> {
  return api<Profile>('/users/me');
}

export async function updateProfile(input: {
  fullName?: string;
  mobileNumber?: string;
}): Promise<Profile> {
  return api<Profile>('/users/me', { method: 'PATCH', data: input });
}

export async function uploadProfilePhoto(uri: string): Promise<Profile> {
  return apiUpload<Profile>(
    '/users/me/profile-photo',
    {},
    [{ field: 'file', uri, name: fileNameFromUri(uri, 'profile.jpg'), mimeType: guessMimeType(uri) }],
  );
}

export async function removeProfilePhoto(): Promise<Profile> {
  return api<Profile>('/users/me/profile-photo', { method: 'DELETE' });
}

export { fileNameFromUri, guessMimeType };
