import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';

import { Button, ErrorText, Field, Gap, Screen, T } from '@/components/ui';
import { errorMessage, supabase } from '@/lib/supabase';
import { colors, radius, sizes, space } from '@/theme';

// Sign in with Apple first, email one-time code as the fallback. No passwords (SEC-AU1).
export default function SignIn() {
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS === 'ios') AppleAuthentication.isAvailableAsync().then(setAppleAvailable);
  }, []);

  const apple = async () => {
    setError(null);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
      });
      if (!credential.identityToken) throw new Error('Apple did not return a sign-in token.');
      const { error: e } = await supabase.auth.signInWithIdToken({ provider: 'apple', token: credential.identityToken });
      if (e) throw e;
    } catch (e) {
      if ((e as { code?: string }).code !== 'ERR_REQUEST_CANCELED') setError(errorMessage(e));
    }
  };

  const sendCode = async () => {
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.auth.signInWithOtp({ email: email.trim().toLowerCase() });
    setBusy(false);
    if (e) setError(errorMessage(e));
    else setSent(true);
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'email' });
    setBusy(false);
    if (e) setError(errorMessage(e));
  };

  return (
    <Screen>
      <Gap h={space.xl} />
      <T v="screenTitle">Sign in</T>
      <T v="bodySmall" color={colors.textSecondary}>
        New here or coming back, it&apos;s the same step.
      </T>
      <Gap h={space.xs} />
      {appleAvailable ? (
        <>
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.CONTINUE}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.WHITE}
            cornerRadius={radius.md}
            style={{ height: sizes.button }}
            onPress={apple}
          />
          <T v="overline" color={colors.textMuted} style={{ textAlign: 'center' }}>
            or use your email
          </T>
        </>
      ) : null}
      {!sent ? (
        <>
          <Field
            label="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
            placeholder="you@example.com"
          />
          <Button title="Email me a code" onPress={sendCode} loading={busy} disabled={!/^\S+@\S+\.\S+$/.test(email)} />
        </>
      ) : (
        <>
          <T v="bodySmall" color={colors.textSecondary}>
            We sent a 6-digit code to {email}.
          </T>
          <Field
            label="Code"
            value={code}
            onChangeText={setCode}
            keyboardType="number-pad"
            autoComplete="one-time-code"
            maxLength={6}
            placeholder="123456"
          />
          <Button title="Sign in" onPress={verify} loading={busy} disabled={code.trim().length < 6} />
          <Button title="Use a different email" variant="ghost" onPress={() => setSent(false)} />
        </>
      )}
      <ErrorText>{error}</ErrorText>
      <Button title="Back" variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}
