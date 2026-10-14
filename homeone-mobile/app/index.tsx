import { Redirect } from 'expo-router';
import { useAuthStore, roleHome } from '../src/store/authStore';
import { LoadingIndicator } from '../src/components/common';
import { View } from 'react-native';

export default function Index() {
  const ready = useAuthStore((s) => s.ready);
  const session = useAuthStore((s) => s.session);

  if (!ready) {
    return (
      <View className="flex-1 items-center justify-center bg-white">
        <LoadingIndicator message="Loading HOMEONE…" />
      </View>
    );
  }

  if (session?.role) {
    return <Redirect href={roleHome(session.role) as never} />;
  }

  return <Redirect href="/intro" />;
}
