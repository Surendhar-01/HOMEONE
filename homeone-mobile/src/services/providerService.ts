import { api, apiUpload, fileNameFromUri, guessMimeType } from './api';
import type {
  ProviderProfile,
  ServiceDomain,
  ServiceItem,
  VerificationStatusInfo,
  WorkingHour,
} from '../types';

export async function listServiceDomains(): Promise<ServiceDomain[]> {
  return api<ServiceDomain[]>('/service-domains');
}

export async function listServices(domainId: string): Promise<ServiceItem[]> {
  return api<ServiceItem[]>(`/services?domainId=${encodeURIComponent(domainId)}`);
}

export interface ProviderRegistrationInput {
  fullName: string;
  mobileNumber: string;
  email: string;
  password: string;
  confirmPassword: string;
  domainName: string;
  skills: string[];
  yearsOfExperience: number;
  languagesSpoken: string[];
  businessAddress: string;
  latitude?: number;
  longitude?: number;
  workingHours?: WorkingHour[];
  hasCertificate?: boolean;
  agreedToTerms: boolean;
}

export async function registerProvider(input: ProviderRegistrationInput) {
  return api('/providers/register', { method: 'POST', data: input });
}

export async function getMyProvider(): Promise<ProviderProfile> {
  return api<ProviderProfile>('/providers/me');
}

export async function getVerificationStatus(): Promise<VerificationStatusInfo> {
  return api<VerificationStatusInfo>('/providers/verification-status');
}

export async function uploadProviderDocument(
  documentType: 'GOVERNMENT_ID' | 'CERTIFICATE',
  file: { uri: string; mimeType?: string; name?: string } | null,
  noCertificate = false,
): Promise<ProviderProfile> {
  return apiUpload<ProviderProfile>(
    '/providers/documents',
    { documentType, noCertificate: noCertificate ? true : undefined },
    file
      ? [
          {
            field: 'file',
            uri: file.uri,
            name: file.name ?? fileNameFromUri(file.uri, 'document.jpg'),
            mimeType: file.mimeType ?? guessMimeType(file.uri),
          },
        ]
      : [],
  );
}

export async function uploadWorkPhotos(
  assets: { uri: string; mimeType?: string; name?: string }[],
): Promise<ProviderProfile> {
  return apiUpload<ProviderProfile>(
    '/providers/work-photos',
    {},
    assets.map((file, index) => ({
      field: 'files',
      uri: file.uri,
      name: file.name ?? fileNameFromUri(file.uri, `work-${index}.jpg`),
      mimeType: file.mimeType ?? guessMimeType(file.uri),
    })),
  );
}

export async function updateWorkingHours(workingHours: WorkingHour[]) {
  return api('/providers/working-hours', { method: 'PUT', data: { workingHours } });
}

export async function setAvailability(isOnline: boolean): Promise<ProviderProfile> {
  return api<ProviderProfile>('/providers/availability', {
    method: 'PUT',
    data: { isOnline },
  });
}

export async function updateProviderInfo(input: {
  businessAddress?: string;
  latitude?: number;
  longitude?: number;
  yearsOfExperience?: number;
  languagesSpoken?: string[];
}): Promise<ProviderProfile> {
  return api<ProviderProfile>('/providers/me', { method: 'PATCH', data: input });
}

export async function updateProviderSkills(skills: string[]): Promise<ProviderProfile> {
  return api<ProviderProfile>('/providers/skills', { method: 'PUT', data: { skills } });
}

export interface ProviderReview {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export async function getMyReviews(providerId: string): Promise<ProviderReview[]> {
  return api<ProviderReview[]>(`/reviews/provider?providerId=${encodeURIComponent(providerId)}`);
}

export async function getMyRating(providerId: string): Promise<{
  averageRating: number | null;
  totalReviews: number;
}> {
  return api(`/reviews/provider-rating?providerId=${encodeURIComponent(providerId)}`);
}

export async function listNotifications() {
  return api('/notifications');
}
