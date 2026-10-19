import { router } from 'expo-router';
import { Settings, Shield } from 'lucide-react-native';
import { View } from 'react-native';

import { sportsLine } from '@/components/fighter';
import { Avatar, Badge, Button, Card, GymBadge, Header, IconButton, ListRow, Row, Screen, T } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import { useLoad } from '@/hooks/use-load';
import { goalLabel, levelLabel, sportName, weightLabel } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import type { FighterCard } from '@/lib/types';
import { colors, sizes, space } from '@/theme';

export default function Me() {
  const { session, profile, status, isAdmin } = useAuth();
  const me = session!.user.id;
  const { data } = useLoad<FighterCard[]>(() => supabase.rpc('fighter_cards', { p_ids: [me] }), []);
  const card = data[0];
  const gym = useLoad<{ status: string; gym_name: string }[]>(
    () => supabase.from('gym_confirmations').select('status, gym_name').order('created_at', { ascending: false }).limit(1),
    [],
  );
  const pendingGym = gym.data[0]?.status === 'pending';

  return (
    <Screen>
      <Header
        title="Me"
        right={
          <IconButton label="Settings" onPress={() => router.push('/settings')}>
            <Settings color={colors.text} size={22} />
          </IconButton>
        }
      />
      <View style={{ alignItems: 'center', gap: space.xs }}>
        <Avatar path={profile?.avatar_path} name={profile?.display_name} size={sizes.avatar.hero} verified={status?.gym_confirmed} />
        <T v="displayL">{profile?.display_name}</T>
        <T v="callout" color={colors.textSecondary}>
          @{profile?.username}
          {profile?.pronouns ? ` · ${profile.pronouns}` : ''} · {profile?.area}
        </T>
        {status?.gym_confirmed ? <GymBadge gym={profile?.gym_name ?? null} /> : null}
      </View>
      <Button title="Edit profile" variant="secondary" onPress={() => router.push('/edit-profile')} />
      {card ? (
        <Card style={{ gap: space.sm }}>
          <T v="overline" color={colors.textSecondary}>
            Sports
          </T>
          {card.sports.map((s) => (
            <Row key={s.sport} style={{ justifyContent: 'space-between' }}>
              <T v="headline">{sportName(s.sport)}</T>
              <T v="callout" color={colors.textSecondary}>
                {levelLabel(s.level)} · {s.intent === 'train' ? 'Trains' : 'Wants to try'}
              </T>
            </Row>
          ))}
          <Row gap={space.xxs} style={{ flexWrap: 'wrap' }}>
            {profile?.weight_class ? <Badge label={weightLabel(profile.weight_class)} /> : null}
            {profile?.goals.map((g) => <Badge key={g} label={goalLabel(g)} />)}
          </Row>
          {!card.sports.length ? <T color={colors.textSecondary}>{sportsLine(card)}</T> : null}
        </Card>
      ) : null}
      {!status?.gym_confirmed ? (
        <Card style={{ gap: space.sm }}>
          <T v="headline">{pendingGym ? 'Gym confirmation in review' : 'Confirm your gym'}</T>
          <T v="bodySmall" color={colors.textSecondary}>
            {pendingGym
              ? `We're checking ${gym.data[0]?.gym_name}. You'll get a notification when it's done.`
              : 'Adds a blue ring and a "Gym confirmed" badge to your profile.'}
          </T>
          {!pendingGym ? <Button title="Start" variant="secondary" onPress={() => router.push('/verify-gym')} /> : null}
        </Card>
      ) : null}
      <View>
        <ListRow label="Friends" onPress={() => router.push('/friends')} />
        <ListRow label="Safety center" onPress={() => router.push('/safety')} />
        <ListRow label="Settings" onPress={() => router.push('/settings')} />
        {isAdmin ? (
          <ListRow label="Admin" onPress={() => router.push('/admin')} right={<Shield color={colors.accent} size={18} />} />
        ) : null}
      </View>
    </Screen>
  );
}
