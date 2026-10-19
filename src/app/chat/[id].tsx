import { router, useLocalSearchParams } from 'expo-router';
import { MoreHorizontal, Send } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BackHeader, IconButton, Row, T } from '@/components/ui';
import { useMe } from '@/hooks/use-auth';
import { useBadges } from '@/hooks/use-badges';
import { clockTime } from '@/lib/format';
import { errorMessage, supabase } from '@/lib/supabase';
import { hasMoneyWords } from '@/lib/text-checks';
import type { ConversationRow, Message } from '@/lib/types';
import { colors, fonts, radius, screenGutter, space } from '@/theme';

export default function Chat() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const me = useMe();
  const { refresh: refreshBadges } = useBadges();
  const [messages, setMessages] = useState<Message[]>([]);
  const [convo, setConvo] = useState<ConversationRow | null>(null);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const list = useRef<FlatList<Message>>(null);

  const load = useCallback(async () => {
    const [m, c] = await Promise.all([
      supabase.from('messages').select('*').eq('conversation_id', id).order('created_at', { ascending: false }).limit(200),
      supabase.rpc('my_conversations'),
    ]);
    setMessages((m.data as Message[]) ?? []);
    setConvo(((c.data as ConversationRow[]) ?? []).find((r) => r.conversation_id === id) ?? null);
    await supabase.rpc('mark_conversation_read', { p_conversation: id });
    refreshBadges();
  }, [id, refreshBadges]);

  useEffect(() => {
    const channel = supabase
      .channel(`chat:${id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${id}` }, (payload) => {
        const msg = payload.new as Message;
        setMessages((cur) => (cur.some((m) => m.id === msg.id) ? cur : [msg, ...cur]));
        if (msg.sender !== me) supabase.rpc('mark_conversation_read', { p_conversation: id });
      })
      .subscribe((state) => {
        if (state === 'SUBSCRIBED') load();
      });
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, me, load]);

  const other = convo?.card;

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setText('');
    setError(null);
    const { data, error: e } = await supabase.from('messages').insert({ conversation_id: id, body }).select().single();
    if (e) {
      setText(body);
      setError(errorMessage(e).includes('row-level security') ? 'You can\'t message this fighter right now.' : errorMessage(e));
      return;
    }
    setMessages((cur) => (cur.some((m) => m.id === data.id) ? cur : [data as Message, ...cur]));
  };

  const more = () =>
    Alert.alert(other?.display_name ?? 'Chat', undefined, [
      { text: 'View profile', onPress: () => other && router.push(`/fighter/${other.id}`) },
      { text: 'Report', onPress: () => router.push({ pathname: '/report', params: { user: other?.id } }) },
      {
        text: 'Block',
        style: 'destructive',
        onPress: async () => {
          await supabase.rpc('block_user', { p_target: other?.id });
          router.back();
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top', 'bottom']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={{ paddingHorizontal: screenGutter }}>
          <BackHeader
            title={other?.display_name ?? 'Chat'}
            right={
              <IconButton label="More" onPress={more}>
                <MoreHorizontal color={colors.text} />
              </IconButton>
            }
          />
        </View>
        <FlatList
          ref={list}
          inverted
          data={messages}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: screenGutter, gap: space.xs }}
          ListFooterComponent={
            <T v="caption" color={colors.textMuted} style={{ textAlign: 'center', marginBottom: space.md }}>
              Keep it about training. No money, bets or meetups outside a gym.
            </T>
          }
          renderItem={({ item }) => {
            const mine = item.sender === me;
            return (
              <View style={{ alignItems: mine ? 'flex-end' : 'flex-start' }}>
                <View
                  style={{
                    maxWidth: '80%',
                    backgroundColor: mine ? colors.accent : colors.surfaceRaised,
                    borderRadius: radius.card,
                    paddingHorizontal: space.sm,
                    paddingVertical: space.xs,
                  }}>
                  {/* Links stay plain text (SEC-C2). */}
                  <T color={mine ? colors.onAccent : colors.text}>{item.body}</T>
                </View>
                <T v="caption" color={colors.textMuted}>
                  {clockTime(item.created_at)}
                  {mine && item.read_at ? ' · Read' : ''}
                  {item.flagged ? ' · Flagged' : ''}
                </T>
              </View>
            );
          }}
        />
        {error ? (
          <T v="caption" color={colors.danger} style={{ paddingHorizontal: screenGutter }}>
            {error}
          </T>
        ) : null}
        {hasMoneyWords(text) ? (
          <T v="caption" color={colors.warning} style={{ paddingHorizontal: screenGutter }}>
            Reminder: no money or bets on Fadez2Go. Messages like this are flagged.
          </T>
        ) : null}
        {convo && !convo.can_send ? (
          <T v="callout" color={colors.textMuted} style={{ padding: screenGutter, textAlign: 'center' }}>
            This chat is closed.
          </T>
        ) : (
          <Row style={{ padding: space.sm, paddingHorizontal: screenGutter, borderTopWidth: 1, borderTopColor: colors.border }}>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Message"
              placeholderTextColor={colors.textMuted}
              selectionColor={colors.accent}
              multiline
              maxLength={4000}
              style={{
                flex: 1,
                minHeight: 44,
                maxHeight: 120,
                backgroundColor: colors.surface,
                borderRadius: radius.lg,
                borderWidth: 1,
                borderColor: colors.border,
                color: colors.text,
                fontFamily: fonts.regular,
                fontSize: 16,
                paddingHorizontal: space.md,
                paddingTop: 12,
              }}
            />
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Send"
              onPress={send}
              disabled={!text.trim()}
              style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: text.trim() ? colors.accent : colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' }}>
              <Send color={text.trim() ? colors.onAccent : colors.textMuted} size={20} />
            </Pressable>
          </Row>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
