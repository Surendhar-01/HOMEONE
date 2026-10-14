import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '@/context/AuthContext';
import { API_URL, apiRequest } from '@/lib/api';

type Health = { status: string; service: string; supabase: { database: string; auth: string } };

export default function HomeScreen() {
  const { session, principal, logout } = useAuth();
  const [health, setHealth] = useState<Health | null>(null);
  const [healthError, setHealthError] = useState('');
  useEffect(() => { void apiRequest<Health>('/health').then(setHealth).catch(e => setHealthError(e instanceof Error ? e.message : 'Offline')); }, []);

  async function signOut() { await logout(); router.replace('/'); }
  return <ScrollView style={styles.page} contentContainerStyle={styles.content}><View style={styles.header}><Text style={styles.brand}>HOMEONE</Text><Pressable onPress={signOut}><Text style={styles.signOut}>Sign out</Text></Pressable></View><Text style={styles.title}>Your home, handled.</Text><Text style={styles.subtitle}>Book trusted professionals and keep every service organized.</Text><View style={styles.statusCard}><View style={[styles.dot, health?.status === 'ok' ? styles.online : styles.offline]} /><View style={styles.flex}><Text style={styles.cardTitle}>{health?.status === 'ok' ? 'Backend connected' : healthError ? 'Backend unavailable' : 'Checking backend…'}</Text><Text style={styles.cardBody}>{health ? `Database ${health.supabase.database} · Auth ${health.supabase.auth}` : healthError || API_URL}</Text></View></View><View style={styles.grid}><Service icon="⚡" name="Electrical" /><Service icon="💧" name="Plumbing" /><Service icon="❄️" name="AC service" /><Service icon="✨" name="Cleaning" /></View><View style={styles.profile}><Text style={styles.cardTitle}>Signed-in account</Text><Text style={styles.cardBody}>Role: {principal?.role ?? session?.role ?? 'CUSTOMER'}</Text><Text style={styles.cardBody}>User ID: {principal?.userId ?? session?.userId}</Text></View></ScrollView>;
}

function Service({ icon, name }: { icon: string; name: string }) { return <View style={styles.service}><Text style={styles.icon}>{icon}</Text><Text style={styles.serviceName}>{name}</Text></View>; }
const styles = StyleSheet.create({ page: { flex: 1, backgroundColor: '#F8FAFC' }, content: { padding: 24, paddingTop: 58, gap: 20 }, header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, brand: { color: '#0F766E', fontSize: 15, fontWeight: '800', letterSpacing: 2 }, signOut: { color: '#0F766E', fontWeight: '700' }, title: { color: '#0F172A', fontSize: 36, fontWeight: '900', lineHeight: 42, marginTop: 12 }, subtitle: { color: '#64748B', fontSize: 17, lineHeight: 25 }, statusCard: { flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: '#FFFFFF', borderRadius: 18, padding: 18, elevation: 2 }, dot: { width: 12, height: 12, borderRadius: 6 }, online: { backgroundColor: '#16A34A' }, offline: { backgroundColor: '#F59E0B' }, flex: { flex: 1 }, cardTitle: { color: '#0F172A', fontSize: 16, fontWeight: '800' }, cardBody: { color: '#64748B', fontSize: 13, lineHeight: 20 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, service: { width: '47%', minHeight: 120, backgroundColor: '#FFFFFF', borderRadius: 20, padding: 18, justifyContent: 'space-between', elevation: 1 }, icon: { fontSize: 30 }, serviceName: { color: '#1E293B', fontSize: 16, fontWeight: '700' }, profile: { backgroundColor: '#CCFBF1', borderRadius: 20, padding: 20, gap: 5 } });
