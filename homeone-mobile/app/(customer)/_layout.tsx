import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';

type TabIconName = 'home' | 'compass' | 'calendar-check' | 'bell' | 'account';

function TabIcon({ name, color, size }: { name: TabIconName; color: ColorValue; size: number }) {
  return <MaterialCommunityIcons name={name} size={size} color={color as string} />;
}

function tabIcon(name: TabIconName) {
  return function CustomerTabIcon({ color, size }: { color: ColorValue; size: number }) {
    return <TabIcon name={name} color={color} size={size} />;
  };
}

export default function CustomerTabs() {
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
        options={{ title: 'Home', tabBarIcon: tabIcon('home') }}
      />
      <Tabs.Screen
        name="explore"
        options={{ title: 'Explore', tabBarIcon: tabIcon('compass') }}
      />
      <Tabs.Screen
        name="bookings"
        options={{ title: 'Bookings', tabBarIcon: tabIcon('calendar-check') }}
      />
      <Tabs.Screen
        name="notifications"
        options={{ title: 'Alerts', tabBarIcon: tabIcon('bell') }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: tabIcon('account') }}
      />
      <Tabs.Screen name="add-home" options={{ href: null, title: 'Add Home' }} />
      <Tabs.Screen name="professionals" options={{ href: null, title: 'Professionals' }} />
      <Tabs.Screen name="professional" options={{ href: null, title: 'Professional' }} />
      <Tabs.Screen name="book-service" options={{ href: null, title: 'Book Service' }} />
      <Tabs.Screen name="booking" options={{ href: null, title: 'Booking Details' }} />
      <Tabs.Screen name="review" options={{ href: null, title: 'Write Review' }} />
    </Tabs>
  );
}