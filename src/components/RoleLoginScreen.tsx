import { Link, router } from 'expo-router';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Field, formStyles, PrimaryButton } from '@/components/Form';
import { useAuth } from '@/context/AuthContext';
import type { AuthSession } from '@/lib/api';

type Role = NonNullable<AuthSession['role']>;
const roleContent: Record<Role, { title: string; subtitle: string; badge: string }> = {
  CUSTOMER: { title: 'Customer login', subtitle: 'Book and manage trusted home services.', badge: '⌂' },
  PROFESSIONAL: { title: 'Provider login', subtitle: 'View jobs and manage your service profile.', badge: '⚒' },
  ADMIN: { title: 'Admin login', subtitle: 'Review providers and manage the platform.', badge: '◆' },
};
export function RoleLoginScreen({ role }: { role: Role }) {
  const copy = roleContent[role]; const { login } = useAuth();
  const [identifier, setIdentifier] = useState(''); const [password, setPassword] = useState('');
  const [error, setError] = useState(''); const [loading, setLoading] = useState(false);
  async function submit() { if (!identifier.trim() || !password) return setError('Email/mobile and password are required.'); setLoading(true); setError(''); try { await login(identifier.trim(), password, role); router.replace('/home'); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to sign in.'); } finally { setLoading(false); } }
  const buttonRole = role === 'PROFESSIONAL' ? 'Provider' : role.charAt(0) + role.slice(1).toLowerCase();
  return <KeyboardAvoidingView style={formStyles.page} behavior={Platform.OS === 'ios' ? 'padding' : undefined}><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={formStyles.content}><Pressable onPress={() => router.back()} style={styles.back}><Text style={styles.backText}>‹ Back</Text></Pressable><View style={styles.badge}><Text style={styles.badgeText}>{copy.badge}</Text></View><View><Text style={formStyles.title}>{copy.title}</Text><Text style={formStyles.subtitle}>{copy.subtitle}</Text></View><View style={formStyles.card}>{error ? <Text style={formStyles.error}>{error}</Text> : null}<Field label="Email or mobile" value={identifier} onChangeText={setIdentifier} autoCapitalize="none" keyboardType="email-address" placeholder="you@example.com" /><Field label="Password" value={password} onChangeText={setPassword} secureTextEntry placeholder="Your password" /><PrimaryButton loading={loading} onPress={submit}>Sign in as {buttonRole}</PrimaryButton>{role === 'CUSTOMER' ? <Link href="/register" style={formStyles.link}>Create a customer account</Link> : null}<Pressable onPress={() => router.replace('/')}><Text style={formStyles.link}>Choose a different role</Text></Pressable></View></ScrollView></KeyboardAvoidingView>;
}
const styles = StyleSheet.create({ back: { alignSelf: 'flex-start', paddingVertical: 8 }, backText: { color: '#0F766E', fontSize: 16, fontWeight: '800' }, badge: { width: 58, height: 58, borderRadius: 19, backgroundColor: '#CCFBF1', alignItems: 'center', justifyContent: 'center', marginTop: 14 }, badgeText: { color: '#0F766E', fontSize: 27, fontWeight: '900' } });
