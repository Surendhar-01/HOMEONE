import { api } from './api';
import type { PendingProvider } from '../types';

export async function listPendingProviders(
  limit = 50,
  offset = 0,
): Promise<{ items: PendingProvider[]; total: number }> {
  return api(`/admin/providers/pending?limit=${limit}&offset=${offset}`);
}

export async function getProviderDetail(providerId: string) {
  return api(`/admin/providers/${providerId}`);
}

export async function getProviderDocuments(providerId: string) {
  return api(`/admin/providers/${providerId}/documents`);
}

export async function approveProvider(providerId: string) {
  return api(`/admin/providers/${providerId}/approve`, { method: 'PATCH', data: {} });
}

export async function rejectProvider(providerId: string, reason: string) {
  return api(`/admin/providers/${providerId}/reject`, { method: 'PATCH', data: { reason } });
}

export async function blockProvider(providerId: string, reason: string) {
  return api(`/admin/providers/${providerId}/block`, { method: 'PATCH', data: { reason } });
}
