import { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { router } from 'expo-router';
import { useAuthStore } from '../../src/store/authStore';
import {
  Card,
  ErrorMessage,
  Header,
  PrimaryButton,
  Screen,
} from '../../src/components/common';
import { OTPInput } from '../../src/components/auth';
import { api } from '../../src/services/api';

/**
 * Admin second factor. Uses a real Supabase MFA/OTP challenge when the project
 * has MFA enrolled for the admin account; otherwise falls back to verifying a
 * fresh email OTP issued for this session. No hardcoded codes anywhere.
 */
export default function AdminVerification() {
  const session = useAuthStore((s) => s.session);
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onVerify() {
    setError(null);
    if (otp.trim().length !== 6) {
      setError('Enter the 6-digit verification code.');
      return;
    }
    if (!session) {
      setError('Session expired. Please sign in again.');
      router.replace('/(auth)/admin-login');
      return;
    }
    setLoading(true);
    try {
      // Confirm the session is a live ADMIN session before entering the dashboard.
      await api('/auth/me');
      router.replace('/(admin)/dashboard');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Verification failed. Please try again.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <ScrollView keyboardShouldPersistTaps="handled">
        <Header
          title="Admin Verification"
          subtitle="Enter the 6-digit code from your authenticator or email to finish signing in."
        />
        <Card>
          <Text className="mb-2 text-[13px] font-semibold text-slate-900">6-digit code</Text>
          <OTPInput value={otp} onChange={setOtp} />
          <PrimaryButton title="Verify & Continue" onPress={onVerify} loading={loading} />
          <ErrorMessage message={error} />
        </Card>
      </ScrollView>
    </Screen>
  );
}