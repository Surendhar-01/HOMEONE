import { Redirect, Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { LoadingIndicator, Screen } from '../../src/components/common';
import { useAuthStore } from '../../src/store/authStore';

type TabIconName = 'view-dashboard' | 'inbox' | 'briefcase' | 'cash' | 'account';

function TabIcon({ name, color, size }: { name: TabIconName; color: ColorValue; size: number }) {
  return <MaterialCommunityIcons name={name} size={size} color={color as string} />;
}

function tabIcon(name: TabIconName) {
  return function ProviderTabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <TabIcon name={name} color={color} size={size} />;
  };
}

export default function ProviderLayout() {
  const ready = useAuthStore((state) => state.ready);
  const session = useAuthStore((state) => state.session);

  if (!ready)
    return (
      <Screen>
        <LoadingIndicator message="Restoring your session…" />
      </Screen>
    );
  if (!session) return <Redirect href="/(auth)/provider-login" />;
  if (session.role !== 'PROFESSIONAL') return <Redirect href="/" />;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#1D4ED8',
        tabBarInactiveTintColor: '#94A3B8',
        headerStyle: { backgroundColor: '#1D4ED8' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '700' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Dashboard', tabBarIcon: tabIcon('view-dashboard') }}
      />
      <Tabs.Screen
        name="requests"
        options={{ title: 'Requests', tabBarIcon: tabIcon('inbox') }}
      />
      <Tabs.Screen
        name="jobs"
        options={{ title: 'My Jobs', tabBarIcon: tabIcon('briefcase') }}
      />
      <Tabs.Screen
        name="earnings"
        options={{ title: 'Earnings', tabBarIcon: tabIcon('cash') }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: tabIcon('account') }}
      />
      <Tabs.Screen name="verification-status" options={{ href: null, title: 'Verification' }} />
      <Tabs.Screen name="availability" options={{ href: null, title: 'Availability' }} />
      <Tabs.Screen name="job" options={{ href: null, title: 'Job Details' }} />
      <Tabs.Screen name="notifications" options={{ href: null, title: 'Notifications' }} />
    </Tabs>
  );
}