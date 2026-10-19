import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Linking } from 'react-native';

import { BackHeader, Button, Card, Checkbox, ChipGroup, ErrorText, Field, Screen, StickyActions, T } from '@/components/ui';
import { REPORT_REASONS } from '@/lib/constants';
import { errorMessage, supabase } from '@/lib/supabase';
import { colors, space } from '@/theme';

export default function Report() {
  const { user, fade, message } = useLocalSearchParams<{ user: string; fade?: string; message?: string }>();
  const [reason, setReason] = useState<string | null>(null);
  const [details, setDetails] = useState('');
  const [block, setBlock] = useState(true);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setBusy(true);
    const { error: e } = await supabase.rpc('report_user', {
      p_target: user,
      p_reason: reason,
      p_details: details.trim() || null,
      p_fade: fade ?? null,
      p_message: message ?? null,
    });
    if (!e && block) await supabase.rpc('block_user', { p_target: user });
    setBusy(false);
    if (e) setError(errorMessage(e));
    else setDone(true);
  };

  if (done)
    return (
      <Screen>
        <BackHeader title="Report sent" />
        <T color={colors.textSecondary}>Thanks. A person on our team reviews every report. We may follow up by email.</T>
        <Button title="Done" onPress={() => router.dismissTo('/')} />
      </Screen>
    );

  return (
    <Screen
      footer={
        <StickyActions>
          <ErrorText>{error}</ErrorText>
          <Button title="Send report" onPress={submit} loading={busy} disabled={!reason} />
        </StickyActions>
      }>
      <BackHeader title="Report" />
      <Card style={{ borderColor: colors.danger, gap: space.xs }}>
        <T v="headline">In danger right now? Call 911.</T>
        <Button title="Call 911" variant="danger" onPress={() => Linking.openURL('tel:911')} />
      </Card>
      <T color={colors.textSecondary}>What happened? They won&apos;t know who reported them.</T>
      <ChipGroup options={REPORT_REASONS} value={reason} onChange={setReason} />
      <Field label="Details (optional)" value={details} onChangeText={setDetails} multiline maxLength={1000} />
      <Checkbox checked={block} onChange={setBlock}>
        <T v="callout">Also block them</T>
      </Checkbox>
    </Screen>
  );
}
