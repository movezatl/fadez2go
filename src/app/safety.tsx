import { router } from 'expo-router';
import { ChevronLeft, Phone, ShieldCheck } from 'lucide-react-native';
import { Linking, View } from 'react-native';

import { Button, Card, Header, IconButton, Row, Screen, T } from '@/components/ui';
import { SAFETY_EMAIL, SAFETY_TIPS } from '@/lib/legal';
import { colors, space } from '@/theme';

export default function SafetyCenter() {
  return (
    <Screen>
      <Header
        title="Safety"
        left={
          <IconButton label="Back" onPress={() => router.back()}>
            <ChevronLeft color={colors.text} />
          </IconButton>
        }
      />
      <Card style={{ borderColor: colors.danger, gap: space.sm }}>
        <Row>
          <Phone color={colors.danger} size={20} />
          <T v="headline">Emergency? Call 911 first.</T>
        </Row>
        <Button title="Call 911" variant="danger" onPress={() => Linking.openURL('tel:911')} />
      </Card>
      <Row>
        <ShieldCheck color={colors.accent} size={20} />
        <T v="overline" color={colors.accent}>
          Before every session
        </T>
      </Row>
      {SAFETY_TIPS.map((tip, i) => (
        <View key={i} style={{ flexDirection: 'row', gap: space.sm }}>
          <T v="headline" color={colors.accent}>
            {i + 1}
          </T>
          <T v="bodySmall" color={colors.textSecondary} style={{ flex: 1 }}>
            {tip}
          </T>
        </View>
      ))}
      <T v="caption" color={colors.textMuted}>
        To report something after the fact, use Report on the fighter&apos;s profile or in chat, or email {SAFETY_EMAIL}.
      </T>
    </Screen>
  );
}
