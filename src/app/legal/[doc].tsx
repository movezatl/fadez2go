import { router, useLocalSearchParams } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import { View } from 'react-native';

import { Header, IconButton, Screen, T } from '@/components/ui';
import { LEGAL_DOCS, LEGAL_DRAFT, VERSIONS } from '@/lib/legal';
import { colors, radius, space } from '@/theme';

export default function LegalDoc() {
  const { doc } = useLocalSearchParams<{ doc: 'terms' | 'privacy' | 'waiver' }>();
  const content = LEGAL_DOCS[doc] ?? LEGAL_DOCS.terms;
  return (
    <Screen>
      <Header
        title={content.title}
        left={
          <IconButton label="Back" onPress={() => router.back()}>
            <ChevronLeft color={colors.text} />
          </IconButton>
        }
      />
      {LEGAL_DRAFT ? (
        <View style={{ backgroundColor: colors.warningSoft, borderRadius: radius.md, padding: space.sm }}>
          <T v="caption" color={colors.warning}>
            Draft under attorney review. Final text will replace this before launch.
          </T>
        </View>
      ) : null}
      <T v="caption" color={colors.textMuted}>
        Version {VERSIONS[doc] ?? VERSIONS.terms}
      </T>
      {content.sections.map((s, i) => (
        <View key={i} style={{ gap: space.xxs }}>
          {s.heading ? <T v="headline">{s.heading}</T> : null}
          <T v="bodySmall" color={colors.textSecondary}>
            {s.body}
          </T>
        </View>
      ))}
    </Screen>
  );
}
