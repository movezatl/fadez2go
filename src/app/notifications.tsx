import { router } from 'expo-router';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackHeader, Button, Empty, Loading, T } from '@/components/ui';
import { useBadges } from '@/hooks/use-badges';
import { useLoad } from '@/hooks/use-load';
import { ago } from '@/lib/format';
import { routeForNotification } from '@/lib/push';
import { supabase } from '@/lib/supabase';
import type { Notification } from '@/lib/types';
import { colors, radius, screenGutter, space } from '@/theme';

export default function Notifications() {
  const { refresh: refreshBadges } = useBadges();
  const { data, loading, refreshing, refresh, setData } = useLoad<Notification[]>(
    () => supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(100),
    [],
  );

  const open = async (n: Notification) => {
    if (!n.read_at) {
      setData((cur) => cur.map((x) => (x.id === n.id ? { ...x, read_at: new Date().toISOString() } : x)));
      await supabase.rpc('mark_notifications_read', { p_ids: [n.id] });
      refreshBadges();
    }
    router.push(routeForNotification(n));
  };

  const readAll = async () => {
    await supabase.rpc('mark_notifications_read', { p_ids: null });
    refresh();
    refreshBadges();
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={{ paddingHorizontal: screenGutter }}>
        <BackHeader title="Alerts" right={data.some((n) => !n.read_at) ? <Button title="Read all" variant="ghost" onPress={readAll} /> : null} />
      </View>
      {loading ? (
        <Loading />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ padding: screenGutter, gap: space.xs }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />}
          ListEmptyComponent={<Empty title="All quiet" body="Fade requests, friend requests and messages show up here." />}
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => open(item)}
              style={({ pressed }) => [
                {
                  padding: space.md,
                  borderRadius: radius.card,
                  borderWidth: 1,
                  borderColor: item.read_at ? colors.border : colors.accent,
                  backgroundColor: colors.surface,
                  gap: 2,
                },
                pressed && { opacity: 0.85 },
              ]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <T v="headline">{item.title}</T>
                <T v="caption" color={colors.textMuted}>
                  {ago(item.created_at)}
                </T>
              </View>
              <T v="bodySmall" color={colors.textSecondary}>
                {item.body}
              </T>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}
