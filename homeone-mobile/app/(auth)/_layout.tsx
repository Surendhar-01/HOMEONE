import { Redirect, Stack } from 'expo-router';
import { roleHome, useAuthStore } from '../../src/store/authStore';

export default function AuthLayout() {
  const ready = useAuthStore((state) => state.ready);
  const session = useAuthStore((state) => state.session);

  if (ready && session?.role) {
    return <Redirect href={roleHome(session.role) as never} />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#1D4ED8' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="customer-login" options={{ title: 'Customer Login' }} />
      <Stack.Screen name="customer-signup" options={{ title: 'Create Account' }} />
      <Stack.Screen name="provider-login" options={{ title: 'Provider Login' }} />
      <Stack.Screen name="provider-signup" options={{ title: 'Join as Provider', headerShown: false }} />
      <Stack.Screen name="admin-login" options={{ title: 'Admin Login' }} />
      <Stack.Screen name="otp-verification" options={{ title: 'Verify Your Account' }} />
      <Stack.Screen name="admin-verification" options={{ title: 'Admin Verification' }} />
      <Stack.Screen name="forgot-password" options={{ title: 'Forgot Password' }} />
      <Stack.Screen name="reset-password" options={{ title: 'Reset Password' }} />
    </Stack>
  );
}
