import { router, useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { Avatar, Button, Card, Gap, Loading, Row, Screen, StickyActions, T } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import { useLoad } from '@/hooks/use-load';
import { SAFETY_TIPS } from '@/lib/legal';
import { firstName, sessionTime } from '@/lib/format';
import { supabase } from '@/lib/supabase';
import type { FadeDetails } from '@/lib/types';
import { colors, sizes, space } from '@/theme';

export default function Matched() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { profile, status } = useAuth();
  const { data, loading } = useLoad<FadeDetails[]>(() => supabase.rpc('fade_details', { p_fade: id }), []);
  const fade = data[0];
  if (loading || !fade) return <Loading />;
  const on = fade.status === 'on';
  const name = firstName(fade.other?.display_name);

  return (
    <Screen
      footer={
        <StickyActions>
          <Button title="View fade" onPress={() => router.replace(`/fade/${id}`)} />
          <Button title="Done" variant="ghost" onPress={() => router.dismissAll()} />
        </StickyActions>
      }>
      <Gap h={space.xxl} />
      <T v="displayXL" color={on ? colors.success : colors.accent} style={{ textAlign: 'center' }}>
        {on ? 'Locked in' : 'Accepted'}
      </T>
      <T color={colors.textSecondary} style={{ textAlign: 'center' }}>
        {on ? `You and ${name} are set.` : `${name} confirms next, then it's locked in.`}
      </T>
      <Row gap={space.lg} style={{ justifyContent: 'center', marginVertical: space.lg }}>
        <Avatar path={profile?.avatar_path} name={profile?.display_name} size={sizes.avatar.lg} verified={status?.gym_confirmed} />
        <T v="displayL" color={colors.accent}>
          ×
        </T>
        <Avatar path={fade.other?.avatar_path} name={fade.other?.display_name} size={sizes.avatar.lg} verified={fade.other?.gym_confirmed} />
      </Row>
      <Card style={{ gap: space.xxs }}>
        <T v="headline">
          {fade.sport_name} · {fade.intensity}
        </T>
        <T color={colors.textSecondary}>{sessionTime(fade.chosen_time)}</T>
        <T color={colors.textSecondary}>{fade.venue_address ? `${fade.venue_name}, ${fade.venue_address}` : fade.venue_name}</T>
      </Card>
      <T v="overline" color={colors.accent}>
        Safety checklist
      </T>
      {SAFETY_TIPS.slice(0, 6).map((tip, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: space.sm }}>
          <T color={colors.success}>✓</T>
          <T v="bodySmall" color={colors.textSecondary} style={{ flex: 1 }}>
            {tip}
          </T>
        </View>
      ))}
    </Screen>
  );
}
