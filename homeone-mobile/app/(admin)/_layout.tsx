import { Redirect, Stack } from 'expo-router';
import { LoadingIndicator, Screen } from '../../src/components/common';
import { useAuthStore } from '../../src/store/authStore';

export default function AdminLayout() {
  const ready = useAuthStore((state) => state.ready);
  const session = useAuthStore((state) => state.session);

  if (!ready) return <Screen><LoadingIndicator message="Restoring your session…" /></Screen>;
  if (!session) return <Redirect href="/(auth)/admin-login" />;
  if (session.role !== 'ADMIN') return <Redirect href="/" />;

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#1E40AF' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Stack.Screen name="dashboard" options={{ title: 'Admin Dashboard' }} />
      <Stack.Screen name="provider" options={{ title: 'Provider Review' }} />
    </Stack>
  );
}
