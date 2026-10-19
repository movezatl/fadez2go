import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { AppState, Platform } from 'react-native';

// The session lives in the iOS Keychain (SEC-AU2). SecureStore values are capped
// at about 2 KB, so long values are split into numbered chunks.
const CHUNK = 1800;

const keychain = {
  async getItem(key: string) {
    const count = await SecureStore.getItemAsync(`${key}.n`);
    if (!count) return SecureStore.getItemAsync(key);
    const parts = await Promise.all(
      Array.from({ length: Number(count) }, (_, i) => SecureStore.getItemAsync(`${key}.${i}`)),
    );
    return parts.some((p) => p == null) ? null : parts.join('');
  },
  async setItem(key: string, value: string) {
    await keychain.removeItem(key);
    const parts: string[] = [];
    for (let i = 0; i < value.length; i += CHUNK) parts.push(value.slice(i, i + CHUNK));
    if (parts.length === 0) parts.push('');
    await Promise.all(parts.map((p, i) => SecureStore.setItemAsync(`${key}.${i}`, p)));
    await SecureStore.setItemAsync(`${key}.n`, String(parts.length));
  },
  async removeItem(key: string) {
    const count = await SecureStore.getItemAsync(`${key}.n`);
    await Promise.all(
      Array.from({ length: Number(count ?? 0) }, (_, i) => SecureStore.deleteItemAsync(`${key}.${i}`)),
    );
    await SecureStore.deleteItemAsync(`${key}.n`);
    await SecureStore.deleteItemAsync(key);
  },
};

const url = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

export const isConfigured = Boolean(url && anonKey);

export const supabase = createClient(url || 'https://not-configured.supabase.co', anonKey || 'missing', {
  auth: {
    storage: Platform.OS === 'web' ? undefined : keychain,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Refresh tokens only while the app is in the foreground.
if (Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}

export function avatarUrl(path: string | null | undefined) {
  if (!path) return null;
  return supabase.storage.from('avatars').getPublicUrl(path).data.publicUrl;
}

// Turns a Postgres error into the sentence the server wrote, for showing to the user.
export function errorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error) return String(error.message);
  return 'Something went wrong. Try again.';
}
