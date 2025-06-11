import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/contexts/AuthContext';
import { FontProvider } from '@/contexts/FontContext';

export default function RootLayout() {
  useFrameworkReady();

  return (
    <FontProvider>
      <AuthProvider>
        <Stack
          screenOptions={{
            headerShown: false,
            animation: 'none',
          }}>
          <Stack.Screen name="landingPage" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="(tabs)" />
        </Stack>
        <StatusBar style="auto" />
      </AuthProvider>
    </FontProvider>
  );
}