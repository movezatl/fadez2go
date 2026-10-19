import { Tabs } from 'expo-router/tabs';
import { Compass, MessageSquare, User, Zap } from 'lucide-react-native';

import { useBadges } from '@/hooks/use-badges';
import { colors, fonts } from '@/theme';

export default function TabLayout() {
  const { fadez, chats } = useBadges();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: { backgroundColor: colors.bg, borderTopColor: colors.border },
        tabBarLabelStyle: { fontFamily: fonts.semibold, fontSize: 11 },
        tabBarBadgeStyle: { backgroundColor: colors.accent, color: colors.onAccent, fontFamily: fonts.bold },
      }}>
      <Tabs.Screen name="index" options={{ title: 'Discover', tabBarIcon: ({ color }) => <Compass color={color} size={24} /> }} />
      <Tabs.Screen
        name="fadez"
        options={{ title: 'Fadez', tabBarBadge: fadez || undefined, tabBarIcon: ({ color }) => <Zap color={color} size={24} /> }}
      />
      <Tabs.Screen
        name="chats"
        options={{ title: 'Chats', tabBarBadge: chats || undefined, tabBarIcon: ({ color }) => <MessageSquare color={color} size={24} /> }}
      />
      <Tabs.Screen name="me" options={{ title: 'Me', tabBarIcon: ({ color }) => <User color={color} size={24} /> }} />
    </Tabs>
  );
}
