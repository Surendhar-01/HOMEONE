import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { ApiError } from '../../src/services/api';
import { login } from '../../src/services/authService';
import { useAuthStore } from '../../src/store/authStore';
import {
  Card,
  CustomInput,
  ErrorMessage,
  Header,
  LinkButton,
  PasswordInput,
  PrimaryButton,
  Screen,
} from '../../src/components/common';
import { isValidEmail } from '../../src/utils/validation';

export default function AdminLogin() {
  const signIn = useAuthStore((s) => s.signIn);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onLogin() {
    setError(null);
    if (!isValidEmail(email)) {
      setError('Enter a valid admin email address.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }
    setLoading(true);
    try {
      const session = await login(email.trim(), password, 'ADMIN');
      await signIn(session);
      router.push('/(auth)/admin-verification');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <ScrollView keyboardShouldPersistTaps="handled">
        <Header
          title="Admin Login"
          subtitle="Restricted area. Admin accounts are created by the platform team — there is no public signup."
        />
        <Card>
          <CustomInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            placeholder="admin@homeone.app"
          />
          <PasswordInput
            label="Password"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
          />
          <PrimaryButton title="Login" onPress={onLogin} loading={loading} />
          <ErrorMessage message={error} />
          <View className="mt-1">
            <LinkButton
              title="Forgot Password?"
              onPress={() => router.push('/(auth)/forgot-password')}
            />
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}