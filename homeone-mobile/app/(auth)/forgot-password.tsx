import { useState } from 'react';
import { ScrollView } from 'react-native';
import { ApiError } from '../../src/services/api';
import { forgotPassword } from '../../src/services/authService';
import {
  Card,
  CustomInput,
  ErrorMessage,
  Header,
  PrimaryButton,
  Screen,
  SuccessMessage,
} from '../../src/components/common';
import { isValidEmail } from '../../src/utils/validation';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit() {
    setError(null);
    setInfo(null);
    if (!isValidEmail(email)) {
      setError('Enter a valid registered email address.');
      return;
    }
    setLoading(true);
    try {
      const result = await forgotPassword(email.trim());
      setInfo(result.message);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Request failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <ScrollView keyboardShouldPersistTaps="handled">
        <Header
          title="Forgot Password"
          subtitle="Enter your registered email. If an account exists, a reset link will be sent to it."
        />
        <Card>
          <CustomInput
            label="Registered Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            placeholder="you@example.com"
          />
          <PrimaryButton title="Send Reset Link" onPress={onSubmit} loading={loading} />
          <SuccessMessage message={info} />
          <ErrorMessage message={error} />
        </Card>
      </ScrollView>
    </Screen>
  );
}