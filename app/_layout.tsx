import { useState, useEffect, useCallback } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SplashScreen from 'expo-splash-screen';
import { ThemeProvider, useTheme } from '@/src/theme';
import OnboardingScreen from './onboarding';

// Keep the splash screen visible until we're ready
SplashScreen.preventAutoHideAsync();

const ONBOARDING_KEY = '@axoscribe_onboarded';

function RootStack() {
  const { colors, isDark } = useTheme();
  return (
    <>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.background },
        }}
      >
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="history" />
        <Stack.Screen name="settings" />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </>
  );
}

export default function RootLayout() {
  const [hasOnboarded, setHasOnboarded] = useState<boolean | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((value) => {
        setHasOnboarded(value === 'true');
      })
      .catch(() => {
        setHasOnboarded(false);
      })
      .finally(() => {
        SplashScreen.hideAsync();
      });
  }, []);

  const completeOnboarding = useCallback(() => {
    AsyncStorage.setItem(ONBOARDING_KEY, 'true').catch(() => {});
    setHasOnboarded(true);
  }, []);

  // Splash screen covers the blank white flash during async load
  if (hasOnboarded === null) return null;

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        {hasOnboarded ? (
          <RootStack />
        ) : (
          <OnboardingScreen onComplete={completeOnboarding} />
        )}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
