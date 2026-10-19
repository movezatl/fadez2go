import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { Platform } from 'react-native';

import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: false,
    shouldSetBadge: true,
  }),
});

// Asks for permission once and saves this phone's Expo push token.
export async function registerForPush(userId: string) {
  if (!Device.isDevice || Platform.OS === 'web') return;
  const current = await Notifications.getPermissionsAsync();
  let granted = current.granted;
  if (!granted && current.canAskAgain) granted = (await Notifications.requestPermissionsAsync()).granted;
  if (!granted) return;
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  try {
    const { data: token } = await Notifications.getExpoPushTokenAsync(projectId ? { projectId } : undefined);
    await supabase.from('profile_private').update({ push_token: token }).eq('id', userId);
  } catch {
    // No EAS project id yet (local dev): in-app notifications still work.
  }
}

export async function clearPushToken(userId: string) {
  await supabase.from('profile_private').update({ push_token: null }).eq('id', userId);
}

type PushData = { type?: string; fade_id?: string | null; conversation_id?: string | null; actor_id?: string | null };

export function routeForNotification(data: PushData) {
  if (data.fade_id) return `/fade/${data.fade_id}` as const;
  if (data.conversation_id) return `/chat/${data.conversation_id}` as const;
  if (data.type?.startsWith('friend') && data.actor_id) return `/fighter/${data.actor_id}` as const;
  if (data.type?.startsWith('gym')) return '/me' as const;
  return '/notifications' as const;
}

// Opens the right screen when a push is tapped.
export function listenForPushTaps() {
  const open = (response: Notifications.NotificationResponse | null) => {
    if (!response) return;
    router.push(routeForNotification(response.notification.request.content.data as PushData));
  };
  open(Notifications.getLastNotificationResponse());
  const sub = Notifications.addNotificationResponseReceivedListener(open);
  return () => sub.remove();
}
