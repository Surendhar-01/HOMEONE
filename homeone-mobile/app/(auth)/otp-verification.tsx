import { useEffect, useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ApiError } from '../../src/services/api';
import { resendOtp, verifyOtp } from '../../src/services/authService';
import { useAuthStore, roleHome } from '../../src/store/authStore';
import {
  Card,
  CustomInput,
  ErrorMessage,
  Header,
  LinkButton,
  PrimaryButton,
  Screen,
  SuccessMessage,
} from '../../src/components/common';
import { OTPInput } from '../../src/components/auth';

const RESEND_COOLDOWN = 60;

export default function OtpVerification() {
  const signIn = useAuthStore((s) => s.signIn);
  const params = useLocalSearchParams<{ email?: string; role?: string }>();
  const [email] = useState(typeof params.email === 'string' ? params.email : '');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  async function onVerify() {
    setError(null);
    if (otp.trim().length !== 6) {
      setError('Enter the 6-digit verification code.');
      return;
    }
    setLoading(true);
    try {
      const session = await verifyOtp(email.trim(), otp.trim());
      await signIn(session);
      router.replace(roleHome(session.role) as never);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function onResend() {
    if (cooldown > 0 || resending) return;
    setError(null);
    setInfo(null);
    setResending(true);
    try {
      const result = await resendOtp(email.trim());
      setCooldown(result.resendAvailableInSeconds ?? RESEND_COOLDOWN);
      setInfo('A new code was sent to your email.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not resend the code.');
    } finally {
      setResending(false);
    }
  }

  return (
    <Screen>
      <ScrollView keyboardShouldPersistTaps="handled">
        <Header title="Verify Your Account" subtitle={`Enter the 6-digit code sent to ${email || 'your email'}.`} />
        <Card>
          {!email ? (
            <CustomInput label="Email" value={email} editable={false} />
          ) : null}
          <Text className="mb-2 text-[13px] font-semibold text-slate-900">6-digit OTP</Text>
          <OTPInput value={otp} onChange={setOtp} />
          <PrimaryButton title="Verify OTP" onPress={onVerify} loading={loading} />
          <LinkButton
            title={
              resending
                ? 'Sending…'
                : cooldown > 0
                  ? `Resend OTP in ${cooldown}s`
                  : 'Resend OTP'
            }
            onPress={onResend}
          />
          <SuccessMessage message={info} />
          <ErrorMessage message={error} />
        </Card>
      </ScrollView>
    </Screen>
  );
}