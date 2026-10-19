import { Anton_400Regular } from '@expo-google-fonts/anton';
import {
  Archivo_400Regular,
  Archivo_500Medium,
  Archivo_600SemiBold,
  Archivo_700Bold,
} from '@expo-google-fonts/archivo';
import { useFonts } from 'expo-font';
import { DarkTheme, ThemeProvider } from 'expo-router';
import { Stack } from 'expo-router/stack';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { Empty, Screen } from '@/components/ui';
import { BadgeProvider } from '@/hooks/use-badges';
import { AuthProvider, useAuth } from '@/hooks/use-auth';
import { listenForPushTaps, registerForPush } from '@/lib/push';
import { isConfigured } from '@/lib/supabase';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync();

const navTheme = {
  ...DarkTheme,
  colors: { ...DarkTheme.colors, background: colors.bg, card: colors.bg, primary: colors.accent, text: colors.text, border: colors.border },
};

function RootStack() {
  const { ready, session, profile, status, needsConsent } = useAuth();
  const signedIn = Boolean(session);
  const onboarded = Boolean(profile?.onboarded);
  const banned = Boolean(status?.banned_at);
  const inApp = signedIn && onboarded && !banned && !needsConsent;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  useEffect(() => {
    if (!inApp || !session) return;
    registerForPush(session.user.id);
    return listenForPushTaps();
  }, [inApp, session]);

  if (!ready) return null;

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
      <Stack.Protected guard={!signedIn}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && !onboarded}>
        <Stack.Screen name="setup" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && banned}>
        <Stack.Screen name="banned" />
      </Stack.Protected>
      <Stack.Protected guard={signedIn && onboarded && !banned && needsConsent}>
        <Stack.Screen name="consent" />
      </Stack.Protected>
      <Stack.Protected guard={inApp}>
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="fighter/[id]" />
        <Stack.Screen name="fade/new" options={{ presentation: 'modal' }} />
        <Stack.Screen name="fade/[id]" />
        <Stack.Screen name="fade/matched" options={{ presentation: 'fullScreenModal' }} />
        <Stack.Screen name="chat/[id]" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="friends" />
        <Stack.Screen name="edit-profile" />
        <Stack.Screen name="settings" />
        <Stack.Screen name="blocked" />
        <Stack.Screen name="verify-gym" />
        <Stack.Screen name="report" options={{ presentation: 'modal' }} />
        <Stack.Screen name="admin" />
      </Stack.Protected>
      <Stack.Screen name="legal/[doc]" />
      <Stack.Screen name="safety" />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Anton_400Regular,
    Archivo_400Regular,
    Archivo_500Medium,
    Archivo_600SemiBold,
    Archivo_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded && !isConfigured) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  if (!isConfigured) {
    return (
      <Screen>
        <Empty
          title="Not connected"
          body="Add EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY to .env, then restart the app."
        />
      </Screen>
    );
  }

  return (
    <ThemeProvider value={navTheme}>
      <StatusBar style="light" />
      <AuthProvider>
        <BadgeProvider>
          <RootStack />
        </BadgeProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
