import * as Location from 'expo-location';
import { router } from 'expo-router';
import { BadgeCheck, Bell, SlidersHorizontal, X } from 'lucide-react-native';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, RefreshControl, ScrollView, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { FighterCard } from '@/components/fighter';
import {
  Button,
  Card,
  Chip,
  ChipGroup,
  Empty,
  ErrorText,
  Gap,
  Header,
  IconButton,
  Label,
  Loading,
  Row,
  Sheet,
  SwitchRow,
  T,
} from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import { useBadges } from '@/hooks/use-badges';
import { useLoad } from '@/hooks/use-load';
import { DISTANCES_MI, LEVELS, SPORTS } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import type { FighterCard as Card_ } from '@/lib/types';
import { colors, screenGutter, space } from '@/theme';

type Filters = { miles: number; level: string | null; nearWeight: boolean; gymOnly: boolean; friendsOnly: boolean };

export default function Discover() {
  const { profile, status } = useAuth();
  const { notifications } = useBadges();
  const [sport, setSport] = useState<string | null>(null);
  const [filters, setFilters] = useState<Filters>({ miles: 30, level: null, nearWeight: true, gymOnly: false, friendsOnly: false });
  const [showFilters, setShowFilters] = useState(false);
  const [hideGymCard, setHideGymCard] = useState(false);

  // Refresh the rounded location when the app opens (the server ignores updates within 3 hours).
  useEffect(() => {
    (async () => {
      const perm = await Location.getForegroundPermissionsAsync();
      if (!perm.granted) return;
      const pos = await Location.getLastKnownPositionAsync();
      if (pos) supabase.rpc('set_location', { p_lat: pos.coords.latitude, p_lng: pos.coords.longitude });
    })();
  }, []);

  const { data, loading, refreshing, refresh, error, reload } = useLoad<Card_[]>(
    () =>
      supabase.rpc('find_fighters', {
        p_sport: sport,
        p_max_miles: filters.miles,
        p_weight_class: filters.nearWeight ? profile?.weight_class : null,
        p_gym_confirmed_only: filters.gymOnly,
        p_friends_only: filters.friendsOnly,
        p_level: filters.level,
      }),
    [],
  );

  useEffect(() => {
    reload();
  }, [sport, filters, reload]);

  const mySports = SPORTS.filter((s) => s.slug !== 'other');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }} edges={['top']}>
      <View style={{ paddingHorizontal: screenGutter }}>
        <Header
          title="Discover"
          right={
            <Row gap={0}>
              <IconButton label="Filters" onPress={() => setShowFilters(true)}>
                <SlidersHorizontal color={colors.text} size={22} />
              </IconButton>
              <IconButton label="Notifications" onPress={() => router.push('/notifications')} badge={notifications}>
                <Bell color={colors.text} size={22} />
              </IconButton>
            </Row>
          }
        />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: screenGutter, gap: space.xs, paddingVertical: space.xs }} style={{ flexGrow: 0 }}>
        <Chip label="All" selected={!sport} onPress={() => setSport(null)} />
        {mySports.map((s) => (
          <Chip key={s.slug} label={s.name} selected={sport === s.slug} onPress={() => setSport(s.slug)} />
        ))}
      </ScrollView>
      {loading ? (
        <Loading />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(c) => c.id}
          contentContainerStyle={{ padding: screenGutter, gap: space.sm, paddingBottom: space.huge }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />}
          ListHeaderComponent={
            <View style={{ gap: space.sm }}>
              <ErrorText>{error}</ErrorText>
              {!status?.gym_confirmed && !hideGymCard ? (
                <Card style={{ gap: space.sm }}>
                  <Row style={{ justifyContent: 'space-between' }}>
                    <Row>
                      <BadgeCheck color={colors.verified} size={20} />
                      <T v="headline">Get your gym confirmed</T>
                    </Row>
                    <Pressable accessibilityLabel="Dismiss" onPress={() => setHideGymCard(true)} hitSlop={10}>
                      <X color={colors.textMuted} size={18} />
                    </Pressable>
                  </Row>
                  <T v="bodySmall" color={colors.textSecondary}>
                    Fighters are more likely to accept a fade from someone with a confirmed gym.
                  </T>
                  <Button title="Confirm my gym" variant="secondary" onPress={() => router.push('/verify-gym')} />
                </Card>
              ) : null}
            </View>
          }
          ListEmptyComponent={
            <Empty title="No fighters in range yet" body="Widen your distance or invite your gym." action={<Button title="Change filters" variant="secondary" onPress={() => setShowFilters(true)} />} />
          }
          renderItem={({ item }) => <FighterCard card={item} />}
        />
      )}

      <Sheet visible={showFilters} onClose={() => setShowFilters(false)} title="Filters">
        <ScrollView contentContainerStyle={{ gap: space.md }}>
          <Label>Distance</Label>
          <ChipGroup
            options={DISTANCES_MI.map((m) => ({ value: String(m), label: `${m} mi` }))}
            value={String(filters.miles)}
            onChange={(v) => setFilters((f) => ({ ...f, miles: Number(v) }))}
          />
          <Label>Skill</Label>
          <ChipGroup
            options={[{ value: 'any', label: 'Any' }, ...LEVELS]}
            value={filters.level ?? 'any'}
            onChange={(v) => setFilters((f) => ({ ...f, level: v === 'any' ? null : v }))}
          />
          <View>
            <SwitchRow label="Near my weight" body="Your class and one either side" value={filters.nearWeight} onChange={(v) => setFilters((f) => ({ ...f, nearWeight: v }))} />
            <SwitchRow label="Gym confirmed only" value={filters.gymOnly} onChange={(v) => setFilters((f) => ({ ...f, gymOnly: v }))} />
            <SwitchRow label="Friends only" value={filters.friendsOnly} onChange={(v) => setFilters((f) => ({ ...f, friendsOnly: v }))} />
          </View>
          <Gap h={space.xs} />
          <Button title="Show fighters" onPress={() => setShowFilters(false)} />
        </ScrollView>
      </Sheet>
    </SafeAreaView>
  );
}
