import { PropsWithChildren } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, TextInputProps, View } from 'react-native';

export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput {...props} placeholderTextColor="#94A3B8" style={styles.input} /></View>;
}

export function PrimaryButton({ children, loading, disabled, onPress }: PropsWithChildren<{ loading?: boolean; disabled?: boolean; onPress(): void }>) {
  return <Pressable accessibilityRole="button" disabled={disabled || loading} onPress={onPress} style={({ pressed }) => [styles.button, (pressed || disabled || loading) && styles.buttonMuted]}>{loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.buttonText}>{children}</Text>}</Pressable>;
}

export const formStyles = StyleSheet.create({
  page: { flex: 1, backgroundColor: '#F8FAFC' },
  content: { paddingHorizontal: 24, paddingTop: 28, paddingBottom: 48, gap: 18 },
  brand: { color: '#0F766E', fontSize: 15, fontWeight: '800', letterSpacing: 2 },
  title: { color: '#0F172A', fontSize: 32, fontWeight: '800' },
  subtitle: { color: '#64748B', fontSize: 16, lineHeight: 24 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 20, gap: 16, shadowColor: '#0F172A', shadowOpacity: 0.08, shadowRadius: 20, elevation: 3 },
  error: { color: '#B91C1C', backgroundColor: '#FEF2F2', padding: 12, borderRadius: 10, lineHeight: 20 },
  link: { color: '#0F766E', fontSize: 15, fontWeight: '700', textAlign: 'center', padding: 8 },
});

const styles = StyleSheet.create({
  field: { gap: 7 },
  label: { color: '#334155', fontSize: 14, fontWeight: '700' },
  input: { minHeight: 52, borderWidth: 1, borderColor: '#CBD5E1', borderRadius: 13, paddingHorizontal: 15, color: '#0F172A', fontSize: 16, backgroundColor: '#FFFFFF' },
  button: { minHeight: 54, borderRadius: 14, backgroundColor: '#0F766E', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  buttonMuted: { opacity: 0.65 },
  buttonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
