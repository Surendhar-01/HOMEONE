import { useState } from 'react';
import { ScrollView, Text, View, Switch } from 'react-native';
import { router } from 'expo-router';
import { ApiError } from '../../src/services/api';
import { registerProfile } from '../../src/services/authService';
import {
  Card,
  CustomInput,
  ErrorMessage,
  Header,
  LinkButton,
  PasswordInput,
  PhoneInput,
  PrimaryButton,
  Screen,
} from '../../src/components/common';
import { validateCustomerSignup } from '../../src/utils/validation';

export default function CustomerSignup() {
  const [fullName, setFullName] = useState('');
  const [mobileNumber, setMobileNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSignup() {
    const validationError = validateCustomerSignup({
      fullName,
      mobileNumber,
      email,
      password,
      confirmPassword,
      agreedToTerms,
    });
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await registerProfile({
        fullName: fullName.trim(),
        mobileNumber: mobileNumber.trim(),
        email: email.trim(),
        password,
        confirmPassword,
        agreedToTerms: true,
        role: 'CUSTOMER',
      });
      router.push({
        pathname: '/(auth)/otp-verification',
        params: { email: email.trim(), role: 'CUSTOMER' },
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Screen>
      <ScrollView keyboardShouldPersistTaps="handled">
        <Header title="Create your account" subtitle="We will email you a 6-digit verification code." />
        <Card>
          <CustomInput label="Full Name" value={fullName} onChangeText={setFullName} placeholder="Ravi Kumar" />
          <PhoneInput label="Mobile Number" value={mobileNumber} onChangeText={setMobileNumber} />
          <CustomInput
            label="Email"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            placeholder="you@example.com"
          />
          <PasswordInput label="Password" value={password} onChangeText={setPassword} placeholder="Min 8 chars, upper + lower + number" />
          <PasswordInput
            label="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            placeholder="Repeat your password"
          />
          <View className="my-3 flex-row items-center">
            <Switch value={agreedToTerms} onValueChange={setAgreedToTerms} />
            <Text className="ml-2.5 flex-1 text-sm text-slate-800">
              I agree to the Terms and Conditions
            </Text>
          </View>
          <PrimaryButton title="Create Account" onPress={onSignup} loading={loading} />
          <ErrorMessage message={error} />
          <LinkButton
            title="Already have an account? Login"
            onPress={() => router.push('/(auth)/customer-login')}
          />
        </Card>
      </ScrollView>
    </Screen>
  );
}