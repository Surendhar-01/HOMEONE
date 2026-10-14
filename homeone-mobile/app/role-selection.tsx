import { ScrollView, Text, View } from 'react-native';
import { router } from 'expo-router';
import { RoleSelectionCard } from '../src/components/auth';

export default function RoleSelection() {
  return (
    <View className="flex-1 bg-white">
      <ScrollView contentContainerStyle={{ padding: 20 }}>
        <Text className="text-[26px] font-bold text-slate-900">Welcome to HomeOne</Text>
        <Text className="mb-5 mt-1 text-sm text-slate-500">How would you like to continue?</Text>

        <RoleSelectionCard
          icon="🏠"
          title="Customer"
          description="Find trusted professionals for your household needs."
          buttonTitle="Continue as Customer"
          onPress={() => router.push('/(auth)/customer-login')}
        />

        <RoleSelectionCard
          icon="🛠️"
          title="Service Provider"
          description="Offer your skills and connect with customers."
          buttonTitle="Continue as Service Provider"
          onPress={() => router.push('/(auth)/provider-login')}
        />

        <RoleSelectionCard
          icon="🛡️"
          title="Admin"
          description="Manage and verify the HomeOne platform."
          buttonTitle="Continue as Admin"
          onPress={() => router.push('/(auth)/admin-login')}
        />
      </ScrollView>
    </View>
  );
}