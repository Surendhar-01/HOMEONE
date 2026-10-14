import { useState } from 'react';
import { ScrollView } from 'react-native';
import { router } from 'expo-router';
import { ApiError } from '../../src/services/api';
import { resetPassword } from '../../src/services/authService';
import {
  Card,
  CustomInput,
  ErrorMessage,
  Header,
  PasswordInput,
  PrimaryButton,
  Screen,
  SuccessMessage,
} from '../../src/components/common';
import { validatePassword } from '../../src/utils/validation';

export default function ResetPassword() {
  const [recoveryToken, setRecoveryToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    setInfo(null);
    if (!recoveryToken.trim()) {
      setError('Paste the recovery token from the reset link (the token_hash part).');
      return;
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      setError(passwordError);
      return;
    }
    if (password !== confirmPassword) {
      setError('Password and confirm password do not match.');
      return;
    }
    setLoading(true);
    try {
      const result = await resetPassword(recoveryToken.trim(), password, confirmPassword);
      setInfo(`${result.message} Returning to sign-in…`);
      setTimeout(() => router.replace('/(auth)/customer-login'), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Reset failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <ScrollView keyboardShouldPersistTaps="handled">
        <Header
          title="Reset Password"
          subtitle="Paste the recovery token from the reset link, then choose a new password."
        />
        <Card>
          <CustomInput
            label="Recovery Token"
            value={recoveryToken}
            onChangeText={setRecoveryToken}
            placeholder="token_hash from the email link"
          />
          <PasswordInput label="New Password" value={password} onChangeText={setPassword} />
          <PasswordInput
            label="Confirm New Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
          />
          <PrimaryButton title="Set New Password" onPress={onSubmit} loading={loading} />
          <SuccessMessage message={info} />
          <ErrorMessage message={error} />
        </Card>
      </ScrollView>
    </Screen>
  );
}