import { api } from './api';
import type { ServiceDomain, ServiceItem } from '../types';

export interface MainCategory {
  id: string;
  categoryName: string;
  icon: string;
  sortOrder: number;
  domains: { id: string; domainName: string }[];
}

export interface ProfessionalCard {
  providerId: string;
  providerName: string;
  profilePhotoUrl: string | null;
  domainName: string | null;
  skills: string[];
  yearsOfExperience: number;
  languagesSpoken: string[];
  isOnline: boolean;
  averageRating: number | null;
  totalReviews: number;
  distanceKm: number | null;
  latitude: number | null;
  longitude: number | null;
}

export interface ProfessionalProfile extends ProfessionalCard {
  businessAddress: string;
  workingHours: { dayOfWeek: number; startTime: string; endTime: string }[];
  hasCertificate: boolean;
  workPhotoUrls: string[];
  reviews: { rating: number; comment: string | null; createdAt: string }[];
}

export async function listMainCategories(): Promise<MainCategory[]> {
  return api<MainCategory[]>('/main-categories');
}

export async function listServiceDomains(): Promise<ServiceDomain[]> {
  return api<ServiceDomain[]>('/service-domains');
}

export async function listServices(domainId: string): Promise<ServiceItem[]> {
  return api<ServiceItem[]>(`/services?domainId=${encodeURIComponent(domainId)}`);
}

export async function discoverProfessionals(input: {
  serviceId: string;
  latitude?: number;
  longitude?: number;
}): Promise<ProfessionalCard[]> {
  const params = new URLSearchParams({ serviceId: input.serviceId });
  if (input.latitude !== undefined && input.longitude !== undefined) {
    params.set('latitude', String(input.latitude));
    params.set('longitude', String(input.longitude));
  }
  return api<ProfessionalCard[]>(`/professionals?${params.toString()}`);
}

export async function getProfessionalProfile(providerId: string): Promise<ProfessionalProfile> {
  return api<ProfessionalProfile>(`/professionals/${providerId}`);
}
