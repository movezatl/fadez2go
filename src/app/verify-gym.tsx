import { router } from 'expo-router';
import { useState } from 'react';

import { BackHeader, Button, Card, ErrorText, Field, Label, Screen, Segmented, StickyActions, T } from '@/components/ui';
import { useAuth } from '@/hooks/use-auth';
import { errorMessage, supabase } from '@/lib/supabase';
import { pickImage, uploadPhoto } from '@/lib/upload';
import { colors, space } from '@/theme';

type Proof = 'card' | 'coach' | 'photo';

export default function VerifyGym() {
  const { profile } = useAuth();
  const me = profile!.id;
  const [gymName, setGymName] = useState(profile?.gym_name ?? '');
  const [address, setAddress] = useState('');
  const [proof, setProof] = useState<Proof>('card');
  const [photo, setPhoto] = useState<string | null>(null);
  const [coach, setCoach] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = gymName.trim().length > 1 && address.trim().length > 4 && (proof === 'coach' ? coach.trim().length > 4 : Boolean(photo));

  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const path = proof === 'coach' ? null : await uploadPhoto('gym-proofs', me, photo!);
      const { error: e } = await supabase.rpc('request_gym_confirmation', {
        p_gym_name: gymName.trim(),
        p_gym_address: address.trim(),
        p_coach_contact: proof === 'coach' ? coach.trim() : null,
        p_proof_path: path,
      });
      if (e) throw e;
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
          <Button title="Submit for review" onPress={submit} loading={busy} disabled={!valid} />
        </StickyActions>
      }>
      <BackHeader title="Confirm gym" />
      <T color={colors.textSecondary}>
        A person on our team checks every request. Once confirmed, you get a blue ring and a &quot;Gym confirmed&quot; badge.
      </T>
      <Field label="Gym name" value={gymName} onChangeText={setGymName} maxLength={80} />
      <Field label="Gym address" value={address} onChangeText={setAddress} maxLength={160} />
      <Label>Proof</Label>
      <Segmented
        options={[
          { value: 'card', label: 'Member card' },
          { value: 'coach', label: 'Coach' },
          { value: 'photo', label: 'Photo at gym' },
        ]}
        value={proof}
        onChange={setProof}
      />
      {proof === 'coach' ? (
        <Field label="Coach or owner's email" value={coach} onChangeText={setCoach} autoCapitalize="none" keyboardType="email-address" maxLength={120} hint="We'll ask them to confirm you train there." />
      ) : (
        <Card style={{ gap: space.sm }}>
          <T v="bodySmall" color={colors.textSecondary}>
            Cover ID numbers, addresses and payment details before you take the photo. Location data is removed, and the photo
            is deleted as soon as we decide.
          </T>
          <Button title={photo ? 'Photo added. Change it' : 'Take a photo'} variant="secondary" onPress={async () => setPhoto((await pickImage(true)) ?? photo)} />
          <Button title="Choose from library" variant="ghost" onPress={async () => setPhoto((await pickImage()) ?? photo)} />
        </Card>
      )}
    </Screen>
  );
}
