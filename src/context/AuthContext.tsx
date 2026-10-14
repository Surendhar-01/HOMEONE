import * as SecureStore from 'expo-secure-store';
import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { apiRequest, AuthSession } from '@/lib/api';

const ACCESS_TOKEN = 'homeone_access_token';
const REFRESH_TOKEN = 'homeone_refresh_token';

type Principal = Pick<AuthSession, 'userId' | 'role' | 'emailVerified' | 'mobileVerified'>;
type AuthContextValue = {
  loading: boolean;
  session: AuthSession | null;
  principal: Principal | null;
  login(identifier: string, password: string, expectedRole: NonNullable<AuthSession['role']>): Promise<void>;
  verifyOtp(email: string, otp: string): Promise<void>;
  logout(): Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [principal, setPrincipal] = useState<Principal | null>(null);

  const saveSession = useCallback(async (next: AuthSession) => {
    await Promise.all([
      SecureStore.setItemAsync(ACCESS_TOKEN, next.accessToken),
      SecureStore.setItemAsync(REFRESH_TOKEN, next.refreshToken),
    ]);
    setSession(next);
    setPrincipal(next);
  }, []);

  const logout = useCallback(async () => {
    const refreshToken = session?.refreshToken ?? await SecureStore.getItemAsync(REFRESH_TOKEN);
    try {
      if (refreshToken) await apiRequest('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) });
    } finally {
      await Promise.all([SecureStore.deleteItemAsync(ACCESS_TOKEN), SecureStore.deleteItemAsync(REFRESH_TOKEN)]);
      setSession(null);
      setPrincipal(null);
    }
  }, [session]);

  useEffect(() => {
    void (async () => {
      try {
        const [accessToken, refreshToken] = await Promise.all([
          SecureStore.getItemAsync(ACCESS_TOKEN), SecureStore.getItemAsync(REFRESH_TOKEN),
        ]);
        if (!accessToken || !refreshToken) return;
        const me = await apiRequest<Principal>('/auth/me', {}, accessToken);
        setPrincipal(me);
        setSession({ ...me, accessToken, refreshToken, expiresIn: 0 });
      } catch {
        await Promise.all([SecureStore.deleteItemAsync(ACCESS_TOKEN), SecureStore.deleteItemAsync(REFRESH_TOKEN)]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    loading,
    session,
    principal,
    login: async (identifier, password, expectedRole) => {
      const next = await apiRequest<AuthSession>('/auth/login', {
        method: 'POST', body: JSON.stringify({ identifier, password, expectedRole }),
      });
      await saveSession(next);
    },
    verifyOtp: async (email, otp) => {
      const next = await apiRequest<AuthSession>('/auth/verify-otp', {
        method: 'POST', body: JSON.stringify({ email, otp, tokenType: 'signup' }),
      });
      await saveSession(next);
    },
    logout,
  }), [loading, logout, principal, saveSession, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used inside AuthProvider');
  return context;
}
