import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable } from 'react-native';

import {
  Avatar,
  BackHeader,
  Button,
  Card,
  ChipGroup,
  ErrorText,
  Field,
  Label,
  Loading,
  Screen,
  Segmented,
  StickyActions,
  T,
} from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import { useLoad } from '@/hooks/use-load';
import { GOALS, LEVELS, SPORTS, WEIGHT_CLASSES } from '@/lib/constants';
import { errorMessage, supabase } from '@/lib/supabase';
import type { Level, SportEntry, WeightClass } from '@/lib/types';
import { pickImage, uploadPhoto } from '@/lib/upload';
import { colors, sizes, space } from '@/theme';

export default function EditProfile() {
  const { profile, status, refresh } = useAuth();
  const me = profile!.id;
  const [displayName, setDisplayName] = useState(profile?.display_name ?? '');
  const [bio, setBio] = useState(profile?.bio ?? '');
  const [area, setArea] = useState(profile?.area ?? '');
  const [pronouns, setPronouns] = useState(profile?.pronouns ?? '');
  const [gymName, setGymName] = useState(profile?.gym_name ?? '');
  const [weight, setWeight] = useState<WeightClass | null>(profile?.weight_class ?? null);
  const [stance, setStance] = useState(profile?.stance ?? 'orthodox');
  const [goals, setGoals] = useState<string[]>(profile?.goals ?? []);
  const [photo, setPhoto] = useState<string | null>(null);
  const [sports, setSports] = useState<Record<string, { level: Level; intent: 'train' | 'try' }> | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const current = useLoad<SportEntry[]>(() => supabase.from('profile_sports').select('sport, level, intent'), []);
  if (current.loading) return <Loading />;
  const picks = sports ?? Object.fromEntries(current.data.map((s) => [s.sport, { level: s.level, intent: s.intent }]));

  const toggle = (slug: string) => {
    const next = { ...picks };
    if (next[slug]) delete next[slug];
    else next[slug] = { level: 'new', intent: 'train' };
    setSports(next);
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      let avatar_path = profile?.avatar_path ?? null;
      if (photo) avatar_path = await uploadPhoto('avatars', me, photo);
      const { error: e } = await supabase
        .from('profiles')
        .update({
          display_name: displayName.trim(),
          bio: bio.trim() || null,
          area: area.trim(),
          pronouns: pronouns.trim() || null,
          gym_name: status?.gym_confirmed ? profile?.gym_name : gymName.trim() || null,
          weight_class: weight,
          stance,
          goals,
          avatar_path,
        })
        .eq('id', me);
      if (e) throw e;
      if (sports) {
        await supabase.from('profile_sports').delete().eq('profile_id', me);
        const rows = Object.entries(sports).map(([sport, p]) => ({ profile_id: me, sport, ...p }));
        if (rows.length) {
          const ins = await supabase.from('profile_sports').insert(rows);
          if (ins.error) throw ins.error;
        }
      }
      await refresh();
      router.back();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen
      footer={
        <StickyActions>
          <ErrorText>{error}</ErrorText>
          <Button title="Save" onPress={save} loading={busy} disabled={!displayName.trim() || Object.keys(picks).length === 0} />
        </StickyActions>
      }>
      <BackHeader title="Edit profile" />
      <Pressable accessibilityLabel="Change photo" onPress={async () => setPhoto((await pickImage()) ?? photo)} style={{ alignSelf: 'center', alignItems: 'center', gap: space.xs }}>
        <Avatar uri={photo} path={profile?.avatar_path} name={displayName} size={sizes.avatar.hero} verified={status?.gym_confirmed} />
        <T v="caption" color={colors.accent}>
          Change photo
        </T>
      </Pressable>
      <Field label="Name" value={displayName} onChangeText={setDisplayName} maxLength={40} />
      <Field label="Pronouns" value={pronouns} onChangeText={setPronouns} maxLength={20} />
      <Field label="Area" value={area} onChangeText={setArea} maxLength={60} />
      <Field label="Bio" value={bio} onChangeText={setBio} maxLength={300} multiline placeholder="What you train, what you're working on" />
      {status?.gym_confirmed ? (
        <T v="caption" color={colors.textMuted}>
          Your gym is confirmed as {profile?.gym_name}. To change it, confirm a new gym.
        </T>
      ) : (
        <Field label="Gym" value={gymName} onChangeText={setGymName} maxLength={80} />
      )}
      <Label>Sports</Label>
      <ChipGroup multi options={SPORTS.map((s) => ({ value: s.slug, label: s.name }))} value={Object.keys(picks)} onChange={toggle} />
      {Object.entries(picks).map(([slug, p]) => (
        <Card key={slug} style={{ gap: space.sm }}>
          <T v="headline">{SPORTS.find((s) => s.slug === slug)?.name}</T>
          <Segmented
            options={[
              { value: 'train', label: 'I train this' },
              { value: 'try', label: 'Want to try' },
            ]}
            value={p.intent}
            onChange={(intent) => setSports({ ...picks, [slug]: { ...p, intent } })}
          />
          <ChipGroup options={LEVELS} value={p.level} onChange={(level) => setSports({ ...picks, [slug]: { ...p, level } })} />
        </Card>
      ))}
      <Label>Weight class</Label>
      <ChipGroup options={WEIGHT_CLASSES} value={weight} onChange={setWeight} />
      <Label>Stance</Label>
      <Segmented
        options={[
          { value: 'orthodox', label: 'Orthodox' },
          { value: 'southpaw', label: 'Southpaw' },
          { value: 'switch', label: 'Switch' },
        ]}
        value={stance as 'orthodox'}
        onChange={setStance}
      />
      <Label>Looking for</Label>
      <ChipGroup multi options={GOALS} value={goals} onChange={(g) => setGoals((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]))} />
    </Screen>
  );
}
