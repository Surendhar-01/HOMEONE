import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { Field, formStyles, PrimaryButton } from '@/components/Form';
import { useAuth } from '@/context/AuthContext';
import { apiRequest } from '@/lib/api';

export default function VerifyOtpScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const email = params.email ?? '';
  const { verifyOtp } = useAuth();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function verify() {
    if (!/^\d{6}$/.test(otp)) return setError('Enter the 6-digit verification code.');
    setLoading(true); setError('');
    try { await verifyOtp(email, otp); router.replace('/home'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Verification failed.'); }
    finally { setLoading(false); }
  }

  async function resend() {
    setError(''); setMessage('');
    try { await apiRequest('/auth/resend-otp', { method: 'POST', body: JSON.stringify({ email, tokenType: 'signup' }) }); setMessage('A new code has been sent.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to resend code.'); }
  }

  return <KeyboardAvoidingView style={formStyles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={formStyles.content}><Text style={formStyles.brand}>HOMEONE</Text><View><Text style={formStyles.title}>Verify your email</Text><Text style={formStyles.subtitle}>Enter the code sent to {email}.</Text></View><View style={formStyles.card}>{error ? <Text style={formStyles.error}>{error}</Text> : null}{message ? <Text style={formStyles.subtitle}>{message}</Text> : null}<Field label="Verification code" value={otp} onChangeText={value => setOtp(value.replace(/\D/g, '').slice(0, 6))} keyboardType="number-pad" maxLength={6} placeholder="123456" /><PrimaryButton loading={loading} onPress={verify}>Verify and continue</PrimaryButton><Text onPress={resend} style={formStyles.link}>Resend code</Text></View></ScrollView></KeyboardAvoidingView>;
}
