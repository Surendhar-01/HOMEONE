import { api } from './api';
import type { CustomerHome } from '../types';

export async function listHomes(): Promise<CustomerHome[]> {
  return api<CustomerHome[]>('/customer/homes');
}

export async function createHome(input: {
  address: string;
  latitude?: number;
  longitude?: number;
  label?: string;
  isDefault?: boolean;
}): Promise<CustomerHome> {
  return api<CustomerHome>('/customer/homes', { method: 'POST', data: input });
}

export async function deleteHome(homeId: string): Promise<{ message: string }> {
  return api(`/customer/homes/${homeId}`, { method: 'DELETE' });
}
