import { router } from 'expo-router';
import { FlatList, Pressable, RefreshControl, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Avatar, Empty, ErrorText, Header, Loading, Row, T } from '@/components/ui';
import { useMe } from '@/hooks/use-auth';
import { useLoad } from '@/hooks/use-load';
import { ago } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { ConversationRow } from '@/lib/types';
import { colors, radius, screenGutter, sizes, space } from '@/theme';

export default function Chats() {
  const me = useMe();
  const { data, loading, refreshing, refresh, error } = useLoad<ConversationRow[]>(() => supabase.rpc('my_conversations'), []);
  // Friends first, then most recent.
  const rows = [...data].sort(
    (a, b) =>
      Number(b.card?.friend_status === 'friends') - Number(a.card?.friend_status === 'friends') ||
      b.last_message_at.localeCompare(a.last_message_at),
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={{ paddingHorizontal: screenGutter }}>
        <Header title="Chats" />
        <ErrorText>{error}</ErrorText>
      </View>
      {loading ? (
        <Loading />
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(c) => c.conversation_id}
          contentContainerStyle={{ paddingHorizontal: screenGutter, paddingBottom: space.huge }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />}
          ListEmptyComponent={
            <Empty title="No chats yet" body="Add a friend or get a fade accepted to start a chat." />
          }
          renderItem={({ item }) => (
            <Pressable
              accessibilityRole="button"
              onPress={() => router.push(`/chat/${item.conversation_id}`)}
              style={({ pressed }) => [
                { flexDirection: 'row', gap: space.md, paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: colors.border, alignItems: 'center' },
                pressed && { opacity: 0.8 },
              ]}>
              <Avatar path={item.card?.avatar_path} name={item.card?.display_name} size={sizes.avatar.md} verified={item.card?.gym_confirmed} />
              <View style={{ flex: 1, gap: 2 }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T v="headline" numberOfLines={1} style={{ flex: 1 }}>
                    {item.card?.display_name ?? 'Fighter'}
                  </T>
                  <T v="caption" color={colors.textMuted}>
                    {ago(item.last_message_at)}
                  </T>
                </Row>
                <Row style={{ justifyContent: 'space-between' }}>
                  <T v="callout" color={item.unread ? colors.text : colors.textSecondary} numberOfLines={1} style={{ flex: 1 }}>
                    {item.last_sender === me ? 'You: ' : ''}
                    {item.last_body}
                  </T>
                  {item.unread ? (
                    <View style={{ backgroundColor: colors.accent, borderRadius: radius.pill, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}>
                      <T v="caption" color={colors.onAccent}>
                        {item.unread}
                      </T>
                    </View>
                  ) : null}
                </Row>
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}
