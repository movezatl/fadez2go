import DateTimePicker from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { Camera } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';

import {
  Avatar,
  Button,
  Card,
  Checkbox,
  ChipGroup,
  ErrorText,
  Field,
  Gap,
  Label,
  Row,
  Screen,
  Segmented,
  StickyActions,
  T,
} from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import { GOALS, LEVELS, SPORTS, WEIGHT_CLASSES } from '@/lib/constants';
import { VERSIONS } from '@/lib/legal';
import { errorMessage, supabase } from '@/lib/supabase';
import { isAdult, USERNAME } from '@/lib/text-checks';
import type { Level, WeightClass } from '@/lib/types';
import { pickImage, uploadPhoto } from '@/lib/upload';
import { colors, space } from '@/theme';

type SportPick = { level: Level; intent: 'train' | 'try' };

const maxBirth = new Date();
maxBirth.setFullYear(maxBirth.getFullYear() - 18);

export default function Setup() {
  const { session, refresh } = useAuth();
  const me = session!.user.id;
  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);

  // Step 1
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [pronouns, setPronouns] = useState('');
  const [birth, setBirth] = useState<Date | null>(null);
  const [area, setArea] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);

  // Step 2
  const [sports, setSports] = useState<Record<string, SportPick>>({});
  const [weight, setWeight] = useState<WeightClass | null>(null);
  const [goals, setGoals] = useState<string[]>([]);

  // Step 3
  const [locationOn, setLocationOn] = useState(false);
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [termsOk, setTermsOk] = useState(false);
  const [waiverOk, setWaiverOk] = useState(false);

  const step1Ok = displayName.trim().length > 0 && USERNAME.test(username) && birth && area.trim().length > 1;
  const step2Ok = Object.keys(sports).length > 0 && weight;

  const toggleSport = (slug: string) =>
    setSports((s) => {
      const next = { ...s };
      if (next[slug]) delete next[slug];
      else next[slug] = { level: 'new', intent: 'train' };
      return next;
    });

  const askLocation = async () => {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (!perm.granted) return;
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
    setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    setLocationOn(true);
  };

  const next = () => {
    setError(null);
    if (step === 1 && birth && !isAdult(birth)) {
      setError('Fadez2Go is for adults 18 and over.');
      return;
    }
    setStep(step + 1);
  };

  const finish = async () => {
    setBusy(true);
    setError(null);
    try {
      await supabase.from('profile_sports').delete().eq('profile_id', me);
      const rows = Object.entries(sports).map(([sport, p]) => ({ profile_id: me, sport, level: p.level, intent: p.intent }));
      const ins = await supabase.from('profile_sports').insert(rows);
      if (ins.error) throw ins.error;

      let avatar_path: string | null = null;
      if (photo) avatar_path = await uploadPhoto('avatars', me, photo);
      const upd = await supabase
        .from('profiles')
        .update({ pronouns: pronouns.trim() || null, goals, avatar_path })
        .eq('id', me);
      if (upd.error) throw upd.error;

      if (coords) await supabase.rpc('set_location', { p_lat: coords.lat, p_lng: coords.lng });

      const { data, error: e } = await supabase.rpc('complete_profile', {
        p_username: username,
        p_display_name: displayName.trim(),
        p_birth_date: birth!.toISOString().slice(0, 10),
        p_area: area.trim(),
        p_weight_class: weight,
        p_terms_version: VERSIONS.terms,
        p_privacy_version: VERSIONS.privacy,
        p_waiver_version: VERSIONS.waiver,
      });
      if (e) throw e;
      if (data === 'underage') {
        setBlocked(true);
        return;
      }
      await refresh();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  };

  if (blocked) {
    return (
      <Screen>
        <Gap h={space.huge} />
        <T v="displayL">18+ only</T>
        <T color={colors.textSecondary}>Fadez2Go is for adults 18 and over, so we can&apos;t set up your account.</T>
        <Button title="Sign out" variant="secondary" onPress={() => supabase.auth.signOut()} />
      </Screen>
    );
  }

  const footer = (
    <StickyActions>
      <ErrorText>{error}</ErrorText>
      {step < 3 ? (
        <Button title="Next" onPress={next} disabled={step === 1 ? !step1Ok : !step2Ok} />
      ) : (
        <Button title="Start finding partners" onPress={finish} loading={busy} disabled={!termsOk || !waiverOk} />
      )}
      {step > 1 ? <Button title="Back" variant="ghost" onPress={() => setStep(step - 1)} /> : null}
    </StickyActions>
  );

  return (
    <Screen footer={footer}>
      <Gap h={space.md} />
      <T v="overline" color={colors.accent}>
        Step {step} of 3
      </T>

      {step === 1 && (
        <>
          <T v="screenTitle">Your fighter card</T>
          <Row gap={space.md}>
            <Pressable accessibilityLabel="Add a photo" onPress={async () => setPhoto((await pickImage()) ?? photo)}>
              {photo ? (
                <Avatar uri={photo} path={null} name={displayName} size={88} />
              ) : (
                <View style={{ width: 88, height: 88, borderRadius: 44, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surfaceRaised }}>
                  <Camera color={colors.textSecondary} />
                </View>
              )}
            </Pressable>
            <T v="caption" color={colors.textSecondary} style={{ flex: 1 }}>
              Optional photo. Location data is removed from photos before upload.
            </T>
          </Row>
          <Field label="Name" value={displayName} onChangeText={setDisplayName} maxLength={40} placeholder="Dani Cruz" />
          <Field
            label="Username"
            value={username}
            onChangeText={(t) => setUsername(t.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
            autoCapitalize="none"
            maxLength={20}
            placeholder="dani_cruz"
            hint="3 to 20 letters, numbers or underscores."
          />
          <Field label="Pronouns (optional)" value={pronouns} onChangeText={setPronouns} maxLength={20} placeholder="she/her" />
          <Field label="Area" value={area} onChangeText={setArea} maxLength={60} placeholder="Midtown, Atlanta" hint="Shown on your profile instead of an address." />
          <View style={{ gap: space.xs }}>
            <Label>Date of birth</Label>
            <Card style={{ alignItems: 'flex-start' }}>
              <DateTimePicker
                value={birth ?? maxBirth}
                mode="date"
                display="compact"
                maximumDate={new Date()}
                themeVariant="dark"
                accentColor={colors.accent}
                onValueChange={(_e, d) => setBirth(d)}
              />
            </Card>
            <T v="caption" color={colors.textMuted}>
              Never shown to anyone. Used once to confirm you&apos;re 18+.
            </T>
          </View>
        </>
      )}

      {step === 2 && (
        <>
          <T v="screenTitle">What you train</T>
          <Label>Sports</Label>
          <ChipGroup
            multi
            options={SPORTS.map((s) => ({ value: s.slug, label: s.name }))}
            value={Object.keys(sports)}
            onChange={toggleSport}
          />
          {Object.entries(sports).map(([slug, pick]) => (
            <Card key={slug} style={{ gap: space.sm }}>
              <T v="headline">{SPORTS.find((s) => s.slug === slug)?.name}</T>
              <Segmented
                options={[
                  { value: 'train', label: 'I train this' },
                  { value: 'try', label: 'Want to try' },
                ]}
                value={pick.intent}
                onChange={(intent) => setSports((s) => ({ ...s, [slug]: { ...s[slug], intent } }))}
              />
              <ChipGroup
                options={LEVELS}
                value={pick.level}
                onChange={(level) => setSports((s) => ({ ...s, [slug]: { ...s[slug], level } }))}
              />
            </Card>
          ))}
          <Label>Weight class</Label>
          <ChipGroup options={WEIGHT_CLASSES} value={weight} onChange={setWeight} />
          {weight ? (
            <T v="caption" color={colors.textMuted}>
              {WEIGHT_CLASSES.find((w) => w.value === weight)?.range}. We only store the class, never your exact weight.
            </T>
          ) : null}
          <Label>Looking for</Label>
          <ChipGroup
            multi
            options={GOALS}
            value={goals}
            onChange={(g) => setGoals((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]))}
          />
        </>
      )}

      {step === 3 && (
        <>
          <T v="screenTitle">Almost in</T>
          <Card style={{ gap: space.sm }}>
            <T v="headline">Find partners near you</T>
            <T v="bodySmall" color={colors.textSecondary}>
              We round your location to about a mile. Other fighters only ever see a rough distance like
              &quot;3 to 10 mi&quot;, never where you are.
            </T>
            {locationOn ? (
              <T v="callout" color={colors.success}>
                Location on
              </T>
            ) : (
              <Button title="Allow location while using the app" variant="secondary" onPress={askLocation} />
            )}
            <T v="caption" color={colors.textMuted}>
              You can skip this; we&apos;ll use your area instead.
            </T>
          </Card>
          <Card style={{ gap: space.md }}>
            <Checkbox checked={termsOk} onChange={setTermsOk}>
              <T v="callout">I agree to the Terms of Service and the Privacy Policy.</T>
            </Checkbox>
            <Checkbox checked={waiverOk} onChange={setWaiverOk}>
              <T v="callout">
                I agree to the Participant Waiver and Release. Sparring can cause serious injury, and I take part at my
                own risk.
              </T>
            </Checkbox>
            <Row gap={space.md} style={{ flexWrap: 'wrap' }}>
              <Button title="Terms" variant="ghost" onPress={() => router.push('/legal/terms')} />
              <Button title="Privacy" variant="ghost" onPress={() => router.push('/legal/privacy')} />
              <Button title="Waiver" variant="ghost" onPress={() => router.push('/legal/waiver')} />
            </Row>
          </Card>
        </>
      )}
    </Screen>
  );
}
