import { router } from 'expo-router';
import { useState } from 'react';

import { Button, Checkbox, ErrorText, Gap, Row, Screen, StickyActions, T } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import { VERSIONS } from '@/lib/legal';
import { errorMessage, supabase } from '@/lib/supabase';
import { colors, space } from '@/theme';

// Shown when the Terms, Privacy Policy or Waiver changed since the user last accepted.
export default function Consent() {
  const { refresh } = useAuth();
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = async () => {
    setBusy(true);
    const { error: e } = await supabase.rpc('accept_documents', {
      p_terms_version: VERSIONS.terms,
      p_privacy_version: VERSIONS.privacy,
      p_waiver_version: VERSIONS.waiver,
    });
    setBusy(false);
    if (e) setError(errorMessage(e));
    else refresh();
  };

  return (
    <Screen
      footer={
        <StickyActions>
          <ErrorText>{error}</ErrorText>
          <Checkbox checked={ok} onChange={setOk}>
            <T v="callout">I agree to the updated Terms, Privacy Policy and Participant Waiver.</T>
          </Checkbox>
          <Button title="Continue" disabled={!ok} loading={busy} onPress={accept} />
        </StickyActions>
      }>
      <Gap h={space.xl} />
      <T v="screenTitle">We updated our terms</T>
      <T color={colors.textSecondary}>Please read and accept them to keep using Fadez2Go.</T>
      <Row gap={space.md}>
        <Button title="Terms" variant="ghost" onPress={() => router.push('/legal/terms')} />
        <Button title="Privacy" variant="ghost" onPress={() => router.push('/legal/privacy')} />
        <Button title="Waiver" variant="ghost" onPress={() => router.push('/legal/waiver')} />
      </Row>
    </Screen>
  );
}
