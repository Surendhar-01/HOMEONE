import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { api, apiWithToken, ACCESS_TOKEN_KEY, REFRESH_TOKEN_KEY } from '../services/api';
import type { AuthPrincipal, AuthSession, UserRole } from '../types';

interface AuthState {
  session: AuthSession | null;
  principal: AuthPrincipal | null;
  ready: boolean;
  hydrate: () => Promise<void>;
  signIn: (session: AuthSession) => Promise<void>;
  signOut: () => Promise<void>;
  setPrincipal: (principal: AuthPrincipal | null) => void;
}

async function fetchPrincipal(token: string): Promise<AuthPrincipal | null> {
  try {
    return await apiWithToken<AuthPrincipal>('/auth/me', token);
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  principal: null,
  ready: false,

  hydrate: async () => {
    try {
      const [access, refresh] = await Promise.all([
        SecureStore.getItemAsync(ACCESS_TOKEN_KEY),
        SecureStore.getItemAsync(REFRESH_TOKEN_KEY),
      ]);
      if (!access || !refresh) {
        set({ ready: true });
        return;
      }
      const principal = await fetchPrincipal(access);
      if (principal) {
        set({
          session: {
            accessToken: access,
            refreshToken: refresh,
            expiresIn: 3600,
            userId: principal.id,
            role: principal.role,
            emailVerified: principal.isEmailVerified,
            mobileVerified: principal.isMobileVerified,
          },
          principal,
          ready: true,
        });
        return;
      }
      // Access token is dead; try the refresh token once.
      try {
        const next = await api<AuthSession>('/auth/refresh-token', {
          method: 'POST',
          data: { refreshToken: refresh },
        });
        await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, next.accessToken);
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, next.refreshToken);
        const restored = await fetchPrincipal(next.accessToken);
        set({ session: next, principal: restored, ready: true });
      } catch {
        await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
        set({ session: null, principal: null, ready: true });
      }
    } catch {
      set({ ready: true });
    }
  },

  signIn: async (session: AuthSession) => {
    await SecureStore.setItemAsync(ACCESS_TOKEN_KEY, session.accessToken);
    await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, session.refreshToken);
    const principal = await fetchPrincipal(session.accessToken);
    set({ session, principal });
  },

  signOut: async () => {
    const { session } = get();
    try {
      if (session?.refreshToken) {
        await api('/auth/logout', {
          method: 'POST',
          data: { refreshToken: session.refreshToken },
        }).catch(() => null);
      }
    } finally {
      await SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY);
      await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
      set({ session: null, principal: null });
    }
  },

  setPrincipal: (principal: AuthPrincipal | null) => set({ principal }),
}));

export function roleHome(role: UserRole | null | undefined): string {
  if (role === 'CUSTOMER') return '/(customer)/dashboard';
  if (role === 'PROFESSIONAL') return '/(provider)/dashboard';
  if (role === 'ADMIN') return '/(admin)/dashboard';
  return '/';
}
