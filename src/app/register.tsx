import { Link, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { Field, formStyles, PrimaryButton } from '@/components/Form';
import { apiRequest } from '@/lib/api';

export default function RegisterScreen() {
  const [form, setForm] = useState({ fullName: '', mobileNumber: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const update = (key: keyof typeof form) => (value: string) => setForm(current => ({ ...current, [key]: value }));

  async function submit() {
    if (Object.values(form).some(value => !value.trim())) return setError('Please complete every field.');
    if (form.password !== form.confirmPassword) return setError('Passwords do not match.');
    setLoading(true); setError('');
    try {
      await apiRequest('/auth/register-profile', { method: 'POST', body: JSON.stringify({ ...form, email: form.email.trim().toLowerCase(), mobileNumber: form.mobileNumber.trim(), fullName: form.fullName.trim(), agreedToTerms: true, role: 'CUSTOMER' }) });
      router.replace({ pathname: '/verify-otp', params: { email: form.email.trim().toLowerCase() } });
    } catch (e) { setError(e instanceof Error ? e.message : 'Unable to create account.'); }
    finally { setLoading(false); }
  }

  return <KeyboardAvoidingView style={formStyles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={formStyles.content}><Text style={formStyles.brand}>HOMEONE</Text><View><Text style={formStyles.title}>Create account</Text><Text style={formStyles.subtitle}>Your trusted home services, in one place.</Text></View><View style={formStyles.card}>{error ? <Text style={formStyles.error}>{error}</Text> : null}<Field label="Full name" value={form.fullName} onChangeText={update('fullName')} placeholder="Ravi Kumar" /><Field label="Mobile number" value={form.mobileNumber} onChangeText={update('mobileNumber')} keyboardType="phone-pad" placeholder="+919876543210" /><Field label="Email" value={form.email} onChangeText={update('email')} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" /><Field label="Password" value={form.password} onChangeText={update('password')} secureTextEntry placeholder="8+ chars, upper, lower and number" /><Field label="Confirm password" value={form.confirmPassword} onChangeText={update('confirmPassword')} secureTextEntry placeholder="Repeat password" /><Text style={formStyles.subtitle}>By continuing, you agree to the Terms and Conditions.</Text><PrimaryButton loading={loading} onPress={submit}>Create account</PrimaryButton><Link href="/login" style={formStyles.link}>Already have an account? Sign in</Link></View></ScrollView></KeyboardAvoidingView>;
}
