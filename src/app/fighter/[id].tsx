import { router, useLocalSearchParams } from 'expo-router';
import { Flag, MessageSquare, UserCheck, UserPlus } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, View } from 'react-native';

import {
  Avatar,
  BackHeader,
  Badge,
  Button,
  Card,
  DistanceBadge,
  Empty,
  ErrorText,
  GymBadge,
  IconButton,
  Loading,
  Row,
  Screen,
  StickyActions,
  T,
} from '@/components/ui';
import { useLoad } from '@/hooks/use-load';
import { goalLabel, levelLabel, sportName, weightLabel } from '@/lib/constants';
import { errorMessage, supabase } from '@/lib/supabase';
import type { FadeSummary, FighterCard } from '@/lib/types';
import { colors, sizes, space } from '@/theme';

export default function FighterProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { data, loading, reload } = useLoad<FighterCard[]>(() => supabase.rpc('fighter_cards', { p_ids: [id] }), []);
  const fades = useLoad<FadeSummary[]>(() => supabase.rpc('my_fades'), []);
  const card = data[0];
  const openFade = fades.data.find((f) => f.other?.id === id && ['pending', 'accepted', 'on'].includes(f.status));
  const canMessage = card?.friend_status === 'friends' || fades.data.some((f) => f.other?.id === id && ['accepted', 'on', 'done'].includes(f.status));

  if (loading) return <Loading />;
  if (!card)
    return (
      <Screen>
        <BackHeader title="" />
        <Empty title="Not available" body="This fighter isn't available." />
      </Screen>
    );

  const addFriend = async () => {
    setBusy(true);
    const { error: e } = await supabase.rpc('send_friend_request', { p_target: id });
    setBusy(false);
    if (e) setError(errorMessage(e));
    else reload();
  };

  const message = async () => {
    const { data: cid, error: e } = await supabase.rpc('open_conversation', { p_other: id });
    if (e) setError(errorMessage(e));
    else router.push(`/chat/${cid}`);
  };

  const more = () =>
    Alert.alert(card.display_name ?? 'Fighter', undefined, [
      { text: 'Report', onPress: () => router.push({ pathname: '/report', params: { user: id } }) },
      {
        text: 'Block',
        style: 'destructive',
        onPress: () =>
          Alert.alert(`Block ${card.display_name}?`, 'You won\'t see each other anywhere, and any open fades are cancelled. They aren\'t told.', [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Block',
              style: 'destructive',
              onPress: async () => {
                await supabase.rpc('block_user', { p_target: id });
                router.back();
              },
            },
          ]),
      },
      { text: 'Cancel', style: 'cancel' },
    ]);

  const friendIcon =
    card.friend_status === 'friends' ? <UserCheck color={colors.success} size={22} /> : <UserPlus color={card.friend_status ? colors.textMuted : colors.text} size={22} />;

  return (
    <Screen
      edges={['top']}
      footer={
        <StickyActions>
          <ErrorText>{error}</ErrorText>
          {openFade ? (
            <Button title={openFade.status === 'on' ? 'Fade locked in' : 'Fade pending'} variant="secondary" onPress={() => router.push(`/fade/${openFade.id}`)} />
          ) : (
            <Button title="Send fade" onPress={() => router.push({ pathname: '/fade/new', params: { to: id } })} />
          )}
          {canMessage ? <Button title="Message" variant="secondary" icon={<MessageSquare color={colors.text} size={18} />} onPress={message} /> : null}
        </StickyActions>
      }>
      <BackHeader
        title=""
        right={
          <Row gap={0}>
            <IconButton
              label={card.friend_status === 'friends' ? 'Friends' : card.friend_status === 'sent' ? 'Request sent' : 'Add friend'}
              onPress={() => (card.friend_status === 'friends' || card.friend_status === 'sent' ? undefined : addFriend())}>
              {friendIcon}
            </IconButton>
            <IconButton label="More" onPress={more}>
              <Flag color={colors.textSecondary} size={20} />
            </IconButton>
          </Row>
        }
      />
      <View style={{ alignItems: 'center', gap: space.xs }}>
        <Avatar path={card.avatar_path} name={card.display_name} size={sizes.avatar.hero} verified={card.gym_confirmed} />
        <T v="displayL" style={{ textAlign: 'center' }}>
          {card.display_name}
        </T>
        <T v="callout" color={colors.textSecondary}>
          @{card.username}
          {card.pronouns ? ` · ${card.pronouns}` : ''}
          {card.area ? ` · ${card.area}` : ''}
        </T>
        <Row gap={space.xxs} style={{ flexWrap: 'wrap', justifyContent: 'center' }}>
          {card.gym_confirmed ? <GymBadge gym={card.gym_name} /> : card.gym_name ? <Badge label={card.gym_name} /> : null}
          <DistanceBadge band={card.distance_band} />
          {card.weight_class ? <Badge label={weightLabel(card.weight_class)} /> : null}
        </Row>
        {card.friend_status === 'received' ? (
          <Button title="Accept friend request" variant="secondary" loading={busy} onPress={addFriend} />
        ) : card.friend_status === 'sent' ? (
          <T v="caption" color={colors.textMuted}>
            Friend request sent
          </T>
        ) : null}
      </View>
      {card.bio ? (
        <T color={colors.textSecondary} style={{ textAlign: 'center' }}>
          {card.bio}
        </T>
      ) : null}
      <Card style={{ gap: space.sm }}>
        <T v="overline" color={colors.textSecondary}>
          Open to fade in
        </T>
        {card.sports.map((s) => (
          <Row key={s.sport} style={{ justifyContent: 'space-between' }}>
            <T v="headline">{sportName(s.sport)}</T>
            <T v="callout" color={colors.textSecondary}>
              {levelLabel(s.level)} · {s.intent === 'train' ? 'Trains' : 'Wants to try'}
            </T>
          </Row>
        ))}
      </Card>
      {card.goals.length ? (
        <Row gap={space.xxs} style={{ flexWrap: 'wrap' }}>
          <T v="overline" color={colors.textSecondary}>
            Looking for
          </T>
          {card.goals.map((g) => (
            <Badge key={g} label={goalLabel(g)} />
          ))}
        </Row>
      ) : null}
      {card.friend_status === 'friends' ? (
        <Button
          title="Remove friend"
          variant="ghost"
          onPress={async () => {
            await supabase.rpc('remove_friend', { p_other: id });
            reload();
          }}
        />
      ) : null}
    </Screen>
  );
}
