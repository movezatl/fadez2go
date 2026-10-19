import { router } from 'expo-router';
import { useState } from 'react';
import { View } from 'react-native';

import { Button, Card, Checkbox, Gap, Screen, StickyActions, T } from '@/components/ui';
import { FIGHTER_CODE } from '@/lib/legal';
import { colors, space } from '@/theme';

export default function Welcome() {
  const [agreed, setAgreed] = useState(false);
  return (
    <Screen
      footer={
        <StickyActions>
          <Checkbox checked={agreed} onChange={setAgreed}>
            <T v="callout" color={colors.textSecondary}>
              I&apos;m 18 or older and I&apos;ll follow the Fighter Code.
            </T>
          </Checkbox>
          <Button title="Get started" disabled={!agreed} onPress={() => router.push('/sign-in')} />
        </StickyActions>
      }>
      <Gap h={space.xxl} />
      <T v="displayXL">Fadez2Go</T>
      <T v="title" color={colors.textSecondary}>
        Find sparring partners near you. Training only, both fighters say yes, no money.
      </T>
      <Gap h={space.sm} />
      <T v="overline" color={colors.accent}>
        The Fighter Code
      </T>
      {FIGHTER_CODE.map((rule, i) => (
        <Card key={rule.title} style={{ flexDirection: 'row', gap: space.md }}>
          <T v="displayL" color={colors.accent}>
            {i + 1}
          </T>
          <View style={{ flex: 1, gap: 4 }}>
            <T v="headline">{rule.title}</T>
            <T v="bodySmall" color={colors.textSecondary}>
              {rule.body}
            </T>
          </View>
        </Card>
      ))}
    </Screen>
  );
}
