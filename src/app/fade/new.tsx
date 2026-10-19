import DateTimePicker from '@react-native-community/datetimepicker';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';

import {
  BackHeader,
  Button,
  Card,
  ChipGroup,
  ErrorText,
  Field,
  Label,
  Loading,
  Row,
  Screen,
  Segmented,
  StickyActions,
  T,
} from '@/components/ui';
import { useLoad } from '@/hooks/use-load';
import { GEAR, INTENSITIES, SESSIONS, sportName } from '@/lib/constants';
import { firstName } from '@/lib/format';
import { errorMessage, supabase } from '@/lib/supabase';
import { hasMoneyWords } from '@/lib/text-checks';
import type { FighterCard } from '@/lib/types';
import { colors, space } from '@/theme';

type Venue = { id: string; name: string; city: string };

const defaultTime = () => {
  const d = new Date(Date.now() + 2 * 86400000);
  d.setHours(10, 0, 0, 0);
  return d;
};

export default function SendFade() {
  const { to } = useLocalSearchParams<{ to: string }>();
  const { data, loading } = useLoad<FighterCard[]>(() => supabase.rpc('fighter_cards', { p_ids: [to] }), []);
  const card = data[0];

  const [sport, setSport] = useState<string | null>(null);
  const [intent, setIntent] = useState<string | null>(null);
  const [intensity, setIntensity] = useState<string | null>(null);
  const [when, setWhen] = useState(defaultTime);
  const [minDate] = useState(() => new Date(Date.now() + 3600000));
  const [venue, setVenue] = useState<Venue | null>(null);
  const [search, setSearch] = useState('');
  const [venues, setVenues] = useState<Venue[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [newGym, setNewGym] = useState({ name: '', address: '', city: '' });
  const [rounds, setRounds] = useState('3');
  const [roundMin, setRoundMin] = useState('3');
  const [gear, setGear] = useState<string[]>(['mouthguard']);
  const [rules, setRules] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(async () => {
      const { data: v } = await supabase.rpc('list_venues', { p_search: search.trim() || null });
      setVenues((v as Venue[]) ?? []);
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  if (loading) return <Loading />;
  if (!card) return null;

  const valid = sport && intent && intensity && venue && when >= minDate;

  const send = async () => {
    setBusy(true);
    setError(null);
    const { data: fid, error: e } = await supabase.rpc('send_fade', {
      p_receiver: to,
      p_sport: sport,
      p_intent: intent,
      p_intensity: intensity,
      p_rules: rules.trim() || `${sportName(sport!)} rules, ${intensity} contact`,
      p_rounds: Number(rounds) || 3,
      p_round_minutes: Number(roundMin) || 3,
      p_gear: gear,
      p_venue: venue!.id,
      p_time_options: [when.toISOString()],
      p_note: note,
    });
    setBusy(false);
    if (e) setError(errorMessage(e));
    else router.replace(`/fade/${fid}`);
  };

  const suggest = async () => {
    const { error: e } = await supabase.rpc('suggest_venue', { p_name: newGym.name, p_address: newGym.address, p_city: newGym.city });
    if (e) setError(errorMessage(e));
    else {
      setSuggesting(false);
      setError(null);
      setNewGym({ name: '', address: '', city: '' });
      setSearch('');
      Alert.alert('Thanks', 'New gyms are checked before they can be used. Pick a listed gym for now.');
    }
  };

  return (
    <Screen
      footer={
        <StickyActions>
          <ErrorText>{error}</ErrorText>
          <Button title={`Send fade to ${firstName(card.display_name)}`} onPress={send} disabled={!valid} loading={busy} />
        </StickyActions>
      }>
      <BackHeader title="Send fade" />
      <T color={colors.textSecondary}>
        {firstName(card.display_name)} has to accept before anything is set. Either of you can call it off any time.
      </T>

      <Label>Sport</Label>
      <ChipGroup options={card.sports.map((s) => ({ value: s.sport, label: sportName(s.sport) }))} value={sport} onChange={setSport} />

      <Label>Session</Label>
      <ChipGroup options={SESSIONS} value={intent} onChange={setIntent} />

      <Label>Intensity</Label>
      <Segmented options={INTENSITIES} value={(intensity ?? '') as 'light'} onChange={setIntensity} />

      <Label>When</Label>
      <Card style={{ alignItems: 'flex-start' }}>
        <DateTimePicker
          value={when}
          mode="datetime"
          display="compact"
          minimumDate={minDate}
          minuteInterval={15}
          themeVariant="dark"
          accentColor={colors.accent}
          onValueChange={(_e, d) => setWhen(d)}
        />
      </Card>

      <Label>Where (gyms only)</Label>
      {venue ? (
        <Card style={{ borderColor: colors.accent }}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <T v="headline">{venue.name}</T>
              <T v="caption" color={colors.textSecondary}>
                {venue.city}
              </T>
            </View>
            <Button title="Change" variant="ghost" onPress={() => setVenue(null)} />
          </Row>
        </Card>
      ) : suggesting ? (
        <Card style={{ gap: space.sm }}>
          <Field label="Gym name" value={newGym.name} onChangeText={(name) => setNewGym((g) => ({ ...g, name }))} />
          <Field label="Address" value={newGym.address} onChangeText={(address) => setNewGym((g) => ({ ...g, address }))} />
          <Field label="City" value={newGym.city} onChangeText={(city) => setNewGym((g) => ({ ...g, city }))} />
          <Button title="Suggest this gym" variant="secondary" onPress={suggest} disabled={newGym.name.length < 2 || newGym.address.length < 5 || newGym.city.length < 2} />
          <Button title="Cancel" variant="ghost" onPress={() => setSuggesting(false)} />
        </Card>
      ) : (
        <View style={{ gap: space.xs }}>
          <Field label="Search gyms" value={search} onChangeText={setSearch} placeholder="Gym name or city" />
          {venues.slice(0, 6).map((v) => (
            <Button key={v.id} title={`${v.name} · ${v.city}`} variant="secondary" onPress={() => setVenue(v)} />
          ))}
          <Button title="My gym isn't listed" variant="ghost" onPress={() => setSuggesting(true)} />
        </View>
      )}

      <Row gap={space.sm}>
        <View style={{ flex: 1 }}>
          <Field label="Rounds" value={rounds} onChangeText={setRounds} keyboardType="number-pad" maxLength={2} />
        </View>
        <View style={{ flex: 1 }}>
          <Field label="Minutes each" value={roundMin} onChangeText={setRoundMin} keyboardType="number-pad" maxLength={2} />
        </View>
      </Row>

      <Label>Gear</Label>
      <ChipGroup
        multi
        options={GEAR}
        value={gear}
        onChange={(g) => setGear((cur) => (cur.includes(g) ? cur.filter((x) => x !== g) : [...cur, g]))}
      />

      <Field label="Rules (optional)" value={rules} onChangeText={setRules} maxLength={200} placeholder="e.g. Thai rules, no elbows" />
      <Field label="Note (optional)" value={note} onChangeText={setNote} maxLength={280} multiline placeholder="Anything they should know" />
      {hasMoneyWords(note) ? (
        <T v="caption" color={colors.warning}>
          Heads up: no money, bets or prizes on Fadez2Go. Notes like this get flagged for review.
        </T>
      ) : null}
    </Screen>
  );
}
