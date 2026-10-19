import DateTimePicker from '@react-native-community/datetimepicker';
import * as Calendar from 'expo-calendar/legacy';
import { router, useLocalSearchParams } from 'expo-router';
import { MessageSquare } from 'lucide-react-native';
import { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';

import {
  Avatar,
  BackHeader,
  Button,
  Card,
  Checkbox,
  ChipGroup,
  DetailList,
  Empty,
  ErrorText,
  Gap,
  Label,
  Loading,
  Row,
  Screen,
  Segmented,
  Sheet,
  StatusPill,
  StickyActions,
  T,
} from '@/components/ui';
import { sportsLine } from '@/components/fighter';
import { useLoad } from '@/hooks/use-load';
import { gearLabel, INTENSITIES, intensityLabel, sessionLabel } from '@/lib/constants';
import { firstName, sessionTime, timeLeft } from '@/lib/format';
import { errorMessage, supabase } from '@/lib/supabase';
import type { FadeDetails } from '@/lib/types';
import { colors, space } from '@/theme';

export function SafetyAcks({
  risk,
  safety,
  onRisk,
  onSafety,
}: {
  risk: boolean;
  safety: boolean;
  onRisk: (v: boolean) => void;
  onSafety: (v: boolean) => void;
}) {
  return (
    <View style={{ gap: space.md }}>
      <Checkbox checked={safety} onChange={onSafety}>
        <T v="callout">
          We&apos;ll train at the gym, wear the agreed gear, have a coach or third person there, agree on a stop signal,
          and stop the moment either of us taps or says stop.
        </T>
      </Checkbox>
      <Checkbox checked={risk} onChange={onRisk}>
        <T v="callout">
          I understand sparring can cause serious injury, I take part at my own risk, and the Participant Waiver applies.
        </T>
      </Checkbox>
      <Pressable onPress={() => router.push('/legal/waiver')}>
        <T v="caption" color={colors.accent}>
          Read the waiver
        </T>
      </Pressable>
    </View>
  );
}

export default function FadeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, reload } = useLoad<FadeDetails[]>(() => supabase.rpc('fade_details', { p_fade: id }), []);
  const fade = data[0];
  const [sheet, setSheet] = useState<'accept' | 'confirm' | 'counter' | 'feedback' | null>(null);
  const [risk, setRisk] = useState(false);
  const [safety, setSafety] = useState(false);
  const [counterTime, setCounterTime] = useState(() => new Date(Date.now() + 3 * 86400000));
  const [minDate] = useState(() => new Date(Date.now() + 3600000));
  const [counterIntensity, setCounterIntensity] = useState<string>('light');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (loading) return <Loading />;
  if (!fade)
    return (
      <Screen>
        <BackHeader title="Fade" />
        <Empty title="Not available" body="This fade isn't available anymore." />
      </Screen>
    );

  const other = fade.other;
  const name = firstName(other?.display_name);
  const when = fade.chosen_time ?? fade.time_options[0];

  const call = async (fn: string, args: Record<string, unknown>, after?: (result: unknown) => void) => {
    setBusy(true);
    setError(null);
    const { data: result, error: e } = await supabase.rpc(fn, args);
    setBusy(false);
    if (e) {
      setError(errorMessage(e));
      return;
    }
    setSheet(null);
    setRisk(false);
    setSafety(false);
    if (after) after(result);
    else reload();
  };

  const accept = () =>
    call('respond_fade', { p_fade: id, p_action: 'accept', p_time: fade.time_options[0], p_ack_risk: risk, p_ack_safety: safety }, () =>
      router.replace({ pathname: '/fade/matched', params: { id } }),
    );
  const confirm = () =>
    call('confirm_fade', { p_fade: id, p_ack_risk: risk, p_ack_safety: safety }, () =>
      router.replace({ pathname: '/fade/matched', params: { id } }),
    );
  const decline = () =>
    Alert.alert('Decline this fade?', `${name} will see "Not this time".`, [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Decline', style: 'destructive', onPress: () => call('respond_fade', { p_fade: id, p_action: 'decline' }) },
    ]);
  const cancel = () =>
    Alert.alert('Call off this fade?', `${name} will be told it's called off. No reason needed.`, [
      { text: 'Keep it', style: 'cancel' },
      { text: 'Call it off', style: 'destructive', onPress: () => call('cancel_fade', { p_fade: id }) },
    ]);
  const counter = () =>
    call(
      'respond_fade',
      { p_fade: id, p_action: 'counter', p_intensity: counterIntensity, p_time_options: [counterTime.toISOString()] },
      (newId) => router.replace(`/fade/${newId}`),
    );
  const message = async () => {
    const { data: cid, error: e } = await supabase.rpc('open_conversation', { p_other: other?.id });
    if (e) setError(errorMessage(e));
    else router.push(`/chat/${cid}`);
  };
  // Opens the system "add event" sheet; no calendar permission needed.
  const addToCalendar = async () => {
    if (!fade.chosen_time) return;
    const start = new Date(fade.chosen_time);
    await Calendar.createEventInCalendarAsync({
      title: `${fade.sport_name} with ${name}`,
      startDate: start,
      endDate: new Date(start.getTime() + 90 * 60000),
      location: [fade.venue_name, fade.venue_address].filter(Boolean).join(', '),
      notes: 'Fadez2Go sparring session. Gear up, agree on a stop signal, stop on a tap.',
    });
  };
  const feedback = (happened: boolean, rating: string | null) =>
    call('leave_fade_feedback', { p_fade: id, p_happened: happened, p_rating: rating }, () => {
      if (rating === 'unsafe') router.push({ pathname: '/report', params: { user: other?.id, fade: id } });
      else reload();
    });

  const isReceiver = fade.i_am === 'receiver';
  const open = ['pending', 'accepted', 'on'].includes(fade.status);
  const past = fade.chosen_time && new Date(fade.chosen_time) < new Date();

  let actions = null;
  if (fade.status === 'pending' && isReceiver) {
    actions = (
      <>
        <Button title="Accept fade" onPress={() => setSheet('accept')} />
        <Row gap={space.sm}>
          <Button title="Decline" variant="secondary" style={{ flex: 1 }} onPress={decline} />
          <Button title="Suggest changes" variant="secondary" style={{ flex: 1 }} onPress={() => setSheet('counter')} />
        </Row>
      </>
    );
  } else if (fade.status === 'accepted' && !isReceiver) {
    actions = (
      <>
        <Button title="Confirm and lock in" onPress={() => setSheet('confirm')} />
        <Button title="Call it off" variant="ghost" onPress={cancel} />
      </>
    );
  } else if (fade.status === 'on' && past && !fade.my_feedback) {
    actions = <Button title="How did it go?" onPress={() => setSheet('feedback')} />;
  } else if (open) {
    actions = (
      <>
        {fade.status === 'on' ? <Button title="Add to calendar" variant="secondary" onPress={addToCalendar} /> : null}
        <Button title="Call it off" variant="ghost" onPress={cancel} />
      </>
    );
  }

  const statusLine =
    fade.status === 'pending'
      ? isReceiver
        ? `Waiting on you · ${timeLeft(fade.expires_at)}`
        : `Waiting on ${name} · ${timeLeft(fade.expires_at)}`
      : fade.status === 'accepted'
        ? isReceiver
          ? `You accepted. Waiting on ${name} to confirm.`
          : `${name} accepted. Confirm to lock it in.`
        : null;

  return (
    <Screen
      footer={
        actions || error ? (
          <StickyActions>
            <ErrorText>{error}</ErrorText>
            {actions}
          </StickyActions>
        ) : null
      }>
      <BackHeader title="Fade" />
      <Pressable onPress={() => other && router.push(`/fighter/${other.id}`)}>
        <Card style={{ flexDirection: 'row', gap: space.md, alignItems: 'center' }}>
          <Avatar path={other?.avatar_path} name={other?.display_name} verified={other?.gym_confirmed} />
          <View style={{ flex: 1, gap: 2 }}>
            <T v="headline">{other?.display_name}</T>
            <T v="caption" color={colors.textSecondary}>
              {other ? sportsLine(other) : ''}
            </T>
            <T v="caption" color={colors.textMuted}>
              {isReceiver ? 'Faded you' : 'You faded them'}
            </T>
          </View>
          <StatusPill status={fade.status} iAm={fade.i_am} />
        </Card>
      </Pressable>
      {statusLine ? (
        <T v="callout" color={colors.warning}>
          {statusLine}
        </T>
      ) : null}
      <DetailList
        rows={[
          { label: 'Sport', value: fade.sport_name },
          { label: 'Session', value: sessionLabel(fade.intent) },
          { label: 'Intensity', value: intensityLabel(fade.intensity) },
          { label: 'Rounds', value: `${fade.rounds} × ${fade.round_minutes} min` },
          { label: 'When', value: sessionTime(when) },
          { label: 'Where', value: fade.venue_address ? `${fade.venue_name}, ${fade.venue_address}` : `${fade.venue_name}, ${fade.venue_city}` },
          { label: 'Gear', value: fade.gear.map(gearLabel).join(', ') || 'None listed' },
          { label: 'Rules', value: fade.rules },
        ]}
      />
      {fade.note ? (
        <Card style={{ gap: space.xxs }}>
          <T v="overline" color={colors.textSecondary}>
            Note
          </T>
          <T>{fade.note}</T>
          {fade.note_flagged ? (
            <T v="caption" color={colors.warning}>
              Flagged: Fadez2Go doesn&apos;t allow money, bets or threats. Report it if something&apos;s off.
            </T>
          ) : null}
        </Card>
      ) : null}
      {!fade.venue_address && open ? (
        <T v="caption" color={colors.textMuted}>
          The gym address shows once you&apos;re both locked in.
        </T>
      ) : null}
      <Row gap={space.md}>
        <Button title="Message" variant="ghost" icon={<MessageSquare color={colors.text} size={16} />} onPress={message} />
        <Button title="Safety tips" variant="ghost" onPress={() => router.push('/safety')} />
        <Button title="Report" variant="ghost" onPress={() => router.push({ pathname: '/report', params: { user: other?.id, fade: id } })} />
      </Row>

      <Sheet visible={sheet === 'accept' || sheet === 'confirm'} onClose={() => setSheet(null)} title={sheet === 'accept' ? 'Accept fade' : 'Lock it in'}>
        <View style={{ gap: space.md }}>
          <T color={colors.textSecondary}>
            {sessionTime(when)} at {fade.venue_name}. {sheet === 'accept' ? `${name} confirms next, then it's locked in.` : ''}
          </T>
          <SafetyAcks risk={risk} safety={safety} onRisk={setRisk} onSafety={setSafety} />
          <ErrorText>{error}</ErrorText>
          <Button title={sheet === 'accept' ? 'Accept' : 'Lock it in'} disabled={!risk || !safety} loading={busy} onPress={sheet === 'accept' ? accept : confirm} />
        </View>
      </Sheet>

      <Sheet visible={sheet === 'counter'} onClose={() => setSheet(null)} title="Suggest changes">
        <View style={{ gap: space.md }}>
          <T color={colors.textSecondary}>This sends {name} a new fade with your changes.</T>
          <Label>New time</Label>
          <DateTimePicker
            value={counterTime}
            mode="datetime"
            display="compact"
            minuteInterval={15}
            minimumDate={minDate}
            themeVariant="dark"
            accentColor={colors.accent}
            onValueChange={(_e, d) => setCounterTime(d)}
          />
          <Label>Intensity</Label>
          <Segmented options={INTENSITIES} value={counterIntensity as 'light'} onChange={setCounterIntensity} />
          <ErrorText>{error}</ErrorText>
          <Button title="Send changes" loading={busy} onPress={counter} />
        </View>
      </Sheet>

      <Sheet visible={sheet === 'feedback'} onClose={() => setSheet(null)} title="How did it go?">
        <View style={{ gap: space.sm }}>
          <T color={colors.textSecondary}>Only you see this. It helps us keep the community solid.</T>
          <ChipGroup
            options={[
              { value: 'good', label: 'Good partner' },
              { value: 'no_show', label: 'They didn\'t show' },
              { value: 'unsafe', label: 'Felt unsafe' },
              { value: 'skipped', label: 'We didn\'t meet' },
            ]}
            value={null}
            onChange={(v) => feedback(v === 'good' || v === 'unsafe', v === 'skipped' ? null : v)}
          />
          <Gap h={space.sm} />
        </View>
      </Sheet>
    </Screen>
  );
}
