import { router } from 'expo-router';
import { Pressable, View } from 'react-native';

import { levelLabel, sportName, weightLabel } from '@/lib/constants';
import { ago, sessionTime } from '@/lib/format';
import type { FadeSummary, FighterCard as Card } from '@/lib/types';
import { colors, radius, sizes, space } from '@/theme';

import { Avatar, Badge, DistanceBadge, Row, StatusPill, T } from './ui';

export function sportsLine(card: Card) {
  return card.sports.map((s) => sportName(s.sport)).join(' · ');
}

export function topLevel(card: Card) {
  const order = ['new', '1-3', '3+', 'amateur', 'pro'];
  const best = [...card.sports].sort((a, b) => order.indexOf(b.level) - order.indexOf(a.level))[0];
  return best ? levelLabel(best.level) : '';
}

export function FighterCard({ card }: { card: Card }) {
  const meta = [topLevel(card), weightLabel(card.weight_class), card.gym_name].filter(Boolean).join(' · ');
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/fighter/${card.id}`)}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          gap: space.md,
          padding: space.md,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: radius.card,
          alignItems: 'center',
        },
        pressed && { opacity: 0.85 },
      ]}>
      <Avatar path={card.avatar_path} name={card.display_name} size={sizes.avatar.card} verified={card.gym_confirmed} />
      <View style={{ flex: 1, gap: 2 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="headline" numberOfLines={1} style={{ flex: 1 }}>
            {card.display_name}
          </T>
          {card.distance_band ? (
            <T v="caption" color={colors.textSecondary}>
              {card.distance_band}
            </T>
          ) : null}
        </Row>
        <T v="callout" color={colors.accent} numberOfLines={1}>
          {sportsLine(card)}
        </T>
        <T v="caption" color={colors.textSecondary} numberOfLines={1}>
          {meta}
        </T>
        <Row gap={space.xxs} style={{ marginTop: 2 }}>
          {card.gym_confirmed ? <Badge tone="verified" label="Gym confirmed" /> : null}
          {card.friend_status === 'friends' ? <Badge label="Friend" /> : null}
          {!card.distance_band && card.area ? <DistanceBadge band={card.area} /> : null}
        </Row>
      </View>
    </Pressable>
  );
}

export function FadeRow({ fade }: { fade: FadeSummary }) {
  const isNew = fade.status === 'pending' && fade.i_am === 'receiver';
  const other = fade.other;
  const when = sessionTime(fade.chosen_time ?? fade.time_options[0]);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => router.push(`/fade/${fade.id}`)}
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          gap: space.md,
          padding: space.md,
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: isNew ? colors.accent : colors.border,
          borderRadius: radius.card,
          alignItems: 'center',
        },
        pressed && { opacity: 0.85 },
      ]}>
      <Avatar path={other?.avatar_path} name={other?.display_name} size={sizes.avatar.md} verified={other?.gym_confirmed} />
      <View style={{ flex: 1, gap: 4 }}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="headline" numberOfLines={1} style={{ flex: 1 }}>
            {other?.display_name ?? 'Fighter'}
          </T>
          {isNew ? (
            <View style={{ backgroundColor: colors.accent, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 2 }}>
              <T v="overline" color={colors.onAccent}>
                New
              </T>
            </View>
          ) : (
            <T v="caption" color={colors.textMuted}>
              {ago(fade.updated_at)}
            </T>
          )}
        </Row>
        <T v="callout" color={colors.textSecondary} numberOfLines={1}>
          {fade.sport_name} · {fade.intensity} · {when}
        </T>
        <StatusPill status={fade.status} iAm={fade.i_am} />
      </View>
    </Pressable>
  );
}
