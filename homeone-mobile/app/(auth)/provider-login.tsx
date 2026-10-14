import { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { ApiError } from '../../src/services/api';
import { login } from '../../src/services/authService';
import { useAuthStore, roleHome } from '../../src/store/authStore';
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
import { isValidEmail, isValidMobile } from '../../src/utils/validation';

export default function ProviderLogin() {
  const signIn = useAuthStore((s) => s.signIn);
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onLogin() {
    setError(null);
    if (!identifier.trim()) {
      setError('Email or mobile number is required.');
      return;
    }
    if (!isValidEmail(identifier) && !isValidMobile(identifier)) {
      setError('Enter a valid email address or mobile number.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }
    setLoading(true);
    try {
      const session = await login(identifier.trim(), password, 'PROFESSIONAL');
      await signIn(session);
      router.replace(roleHome(session.role) as never);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <ScrollView keyboardShouldPersistTaps="handled">
        <Header title="Provider sign in" subtitle="Access your service provider account." />
        <Card>
          <CustomInput
            label="Email / Mobile Number"
            value={identifier}
            onChangeText={setIdentifier}
            keyboardType="email-address"
            placeholder="you@example.com"
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
            <LinkButton
              title="Don't have an account? Register as Provider"
              onPress={() => router.push('/(auth)/provider-signup')}
            />
          </View>
        </Card>
      </ScrollView>
    </Screen>
  );
}