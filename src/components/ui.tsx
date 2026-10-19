import { Image } from 'expo-image';
import { router } from 'expo-router';
import { BadgeCheck, ChevronLeft, MapPin, X } from 'lucide-react-native';
import { type ReactNode } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type TextStyle,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { initials } from '@/lib/format';
import { avatarUrl } from '@/lib/supabase';
import type { FadeStatus } from '@/lib/types';
import { colors, fadeStatus, fonts, radius, screenGutter, sizes, space, type } from '@/theme';

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

type Variant = keyof typeof type;

export function T({
  v = 'body',
  color = colors.text,
  style,
  children,
  numberOfLines,
}: {
  v?: Variant;
  color?: string;
  style?: TextStyle | TextStyle[];
  children: ReactNode;
  numberOfLines?: number;
}) {
  return (
    <Text style={[type[v] as TextStyle, { color }, style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

export function Screen({
  children,
  scroll = true,
  edges = ['top'],
  footer,
  refreshControl,
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: ('top' | 'bottom')[];
  footer?: ReactNode;
  refreshControl?: React.ComponentProps<typeof ScrollView>['refreshControl'];
}) {
  return (
    <SafeAreaView style={styles.screen} edges={edges}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? (
          <ScrollView
            contentContainerStyle={styles.screenContent}
            keyboardShouldPersistTaps="handled"
            refreshControl={refreshControl}>
            {children}
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }}>{children}</View>
        )}
        {footer}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function Header({ title, right, left }: { title: string; right?: ReactNode; left?: ReactNode }) {
  return (
    <View style={styles.header}>
      {left}
      <T v="screenTitle" style={{ flex: 1 }} numberOfLines={1}>
        {title}
      </T>
      {right}
    </View>
  );
}

export function BackHeader({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <Header
      title={title}
      right={right}
      left={
        <IconButton label="Back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}>
          <ChevronLeft color={colors.text} size={28} />
        </IconButton>
      }
    />
  );
}

export function Card({ children, style, accent }: { children: ReactNode; style?: ViewStyle; accent?: boolean }) {
  return <View style={[styles.card, accent && { borderColor: colors.accent }, style]}>{children}</View>;
}

export function Row({ children, gap = space.xs, style }: { children: ReactNode; gap?: number; style?: ViewStyle }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function Gap({ h = space.md }: { h?: number }) {
  return <View style={{ height: h }} />;
}

export function Divider() {
  return <View style={{ height: 1, backgroundColor: colors.border }} />;
}

export function StickyActions({ children }: { children: ReactNode }) {
  return <View style={styles.sticky}>{children}</View>;
}

export function Loading() {
  return (
    <View style={styles.center}>
      <ActivityIndicator color={colors.accent} />
    </View>
  );
}

export function Empty({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <View style={styles.empty}>
      <T v="displayL" style={{ textAlign: 'center' }}>
        {title}
      </T>
      {body ? (
        <T v="bodySmall" color={colors.textSecondary} style={{ textAlign: 'center' }}>
          {body}
        </T>
      ) : null}
      {action}
    </View>
  );
}

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return (
    <View style={styles.error}>
      <T v="callout" color={colors.danger}>
        {children}
      </T>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Controls
// ---------------------------------------------------------------------------

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled,
  loading,
  icon,
  style,
}: {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  icon?: ReactNode;
  style?: ViewStyle;
}) {
  const v = buttonStyles[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: disabled || loading }}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.button,
        v.box,
        pressed && (variant === 'primary' ? { backgroundColor: colors.accentPressed } : { opacity: 0.8 }),
        (disabled || loading) && { opacity: 0.45 },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={v.text.color} />
      ) : (
        <Row gap={space.xs}>
          {icon}
          <Text style={[type.button as TextStyle, v.text]}>{title}</Text>
        </Row>
      )}
    </Pressable>
  );
}

const buttonStyles: Record<ButtonVariant, { box: ViewStyle; text: TextStyle }> = {
  primary: { box: { backgroundColor: colors.accent }, text: { color: colors.onAccent } },
  secondary: {
    box: { backgroundColor: colors.surfaceRaised, borderWidth: 1, borderColor: colors.border },
    text: { color: colors.text },
  },
  ghost: { box: { backgroundColor: 'transparent' }, text: { color: colors.text, textDecorationLine: 'underline' } },
  danger: { box: { borderWidth: 1, borderColor: colors.danger }, text: { color: colors.danger } },
};

export function IconButton({
  onPress,
  children,
  label,
  badge,
}: {
  onPress: () => void;
  children: ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress} hitSlop={8} style={styles.iconButton}>
      {children}
      {badge ? (
        <View style={styles.dot}>
          <Text style={styles.dotText}>{badge > 9 ? '9+' : badge}</Text>
        </View>
      ) : null}
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected && { backgroundColor: colors.accentSoft, borderColor: colors.accent }]}>
      <T v="callout" color={selected ? colors.accent : colors.textSecondary}>
        {label}
      </T>
    </Pressable>
  );
}

export function ChipGroup<V extends string>({
  options,
  value,
  onChange,
  multi,
}: {
  options: readonly { value: V; label: string }[];
  value: V | V[] | null;
  onChange: (v: V) => void;
  multi?: boolean;
}) {
  const selected = (v: V) => (multi ? (value as V[]).includes(v) : value === v);
  return (
    <View style={styles.wrap}>
      {options.map((o) => (
        <Chip key={o.value} label={o.label} selected={selected(o.value)} onPress={() => onChange(o.value)} />
      ))}
    </View>
  );
}

export function Segmented<V extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly { value: V; label: string }[];
  value: V;
  onChange: (v: V) => void;
}) {
  return (
    <View style={styles.segmented}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.value)}
            style={[styles.segment, on && { backgroundColor: colors.segmentSelectedBg }]}>
            <T v="callout" color={on ? colors.segmentSelectedText : colors.textSecondary}>
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

export function Field({
  label,
  hint,
  ...props
}: TextInputProps & { label: string; hint?: string }) {
  return (
    <View style={{ gap: space.xs }}>
      <T v="overline" color={colors.textSecondary}>
        {label}
      </T>
      <TextInput
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.accent}
        {...props}
        style={[styles.input, props.multiline && { height: 96, paddingTop: 12, textAlignVertical: 'top' }]}
      />
      {hint ? (
        <T v="caption" color={colors.textMuted}>
          {hint}
        </T>
      ) : null}
    </View>
  );
}

export function Label({ children }: { children: ReactNode }) {
  return (
    <T v="overline" color={colors.textSecondary} style={{ marginBottom: space.xs }}>
      {children}
    </T>
  );
}

export function Checkbox({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      onPress={() => onChange(!checked)}
      style={{ flexDirection: 'row', gap: space.sm, alignItems: 'flex-start' }}>
      <View style={[styles.box, checked && { backgroundColor: colors.accent, borderColor: colors.accent }]}>
        {checked ? <Text style={{ color: colors.onAccent, fontFamily: fonts.bold, fontSize: 14 }}>✓</Text> : null}
      </View>
      <View style={{ flex: 1 }}>{children}</View>
    </Pressable>
  );
}

export function SwitchRow({ label, body, value, onChange }: { label: string; body?: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={styles.listRow}>
      <View style={{ flex: 1, gap: 2 }}>
        <T v="headline">{label}</T>
        {body ? (
          <T v="caption" color={colors.textSecondary}>
            {body}
          </T>
        ) : null}
      </View>
      <View style={[styles.track, value && { backgroundColor: colors.accent }]}>
        <View style={[styles.knob, value && { alignSelf: 'flex-end' }]} />
      </View>
    </Pressable>
  );
}

export function ListRow({ label, onPress, right, danger }: { label: string; onPress: () => void; right?: ReactNode; danger?: boolean }) {
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.listRow, pressed && { opacity: 0.7 }]}>
      <T v="headline" color={danger ? colors.danger : colors.text} style={{ flex: 1 }}>
        {label}
      </T>
      {right ?? <T color={colors.textMuted}>›</T>}
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

export function Badge({ label, tone = 'neutral', icon }: { label: string; tone?: 'neutral' | 'verified'; icon?: ReactNode }) {
  const verified = tone === 'verified';
  return (
    <View
      style={[
        styles.badge,
        verified ? { backgroundColor: colors.verifiedSoft, borderColor: colors.verifiedSoft } : null,
      ]}>
      {icon}
      <T v="caption" color={verified ? colors.verified : colors.textSecondary}>
        {label}
      </T>
    </View>
  );
}

export function GymBadge({ gym }: { gym: string | null }) {
  return (
    <Badge
      tone="verified"
      label={gym ? `Gym confirmed · ${gym}` : 'Gym confirmed'}
      icon={<BadgeCheck size={14} color={colors.verified} />}
    />
  );
}

export function DistanceBadge({ band }: { band: string | null }) {
  if (!band) return null;
  return <Badge label={band} icon={<MapPin size={12} color={colors.textSecondary} />} />;
}

const statusKey = (s: FadeStatus, iAm?: 'sender' | 'receiver') => {
  if (s === 'on') return 'accepted';
  if (s === 'done') return 'completed';
  if (s === 'accepted') return 'pending';
  return s;
};

export function StatusPill({ status, iAm }: { status: FadeStatus; iAm?: 'sender' | 'receiver' }) {
  const s = fadeStatus[statusKey(status, iAm)];
  const label =
    status === 'accepted' ? (iAm === 'sender' ? 'Confirm to lock in' : 'Waiting on them') : s.label;
  return (
    <View style={[styles.pill, { backgroundColor: s.bg }]}>
      <T v="caption" color={s.fg}>
        {label}
      </T>
    </View>
  );
}

export function Avatar({
  path,
  uri: localUri,
  name,
  size = sizes.avatar.card,
  verified,
}: {
  path: string | null | undefined;
  uri?: string | null;
  name: string | null | undefined;
  size?: number;
  verified?: boolean;
}) {
  const uri = localUri ?? avatarUrl(path);
  const ring = verified ? (size >= sizes.avatar.lg ? sizes.avatarRing.hero : sizes.avatarRing.verified) : 1;
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: ring,
        borderColor: verified ? colors.verified : colors.border,
        backgroundColor: colors.surfaceRaised,
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}>
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size }} contentFit="cover" />
      ) : (
        <Text style={{ fontFamily: fonts.display, fontSize: size * 0.38, color: colors.textSecondary }}>{initials(name)}</Text>
      )}
    </View>
  );
}

export function DetailList({ rows }: { rows: { label: string; value: ReactNode }[] }) {
  return (
    <View style={styles.card}>
      {rows.map((r, i) => (
        <View key={r.label} style={[styles.detailRow, i > 0 && { borderTopWidth: 1, borderTopColor: colors.border }]}>
          <T v="callout" color={colors.textSecondary}>
            {r.label}
          </T>
          {typeof r.value === 'string' ? (
            <T v="callout" style={{ fontFamily: fonts.semibold, flexShrink: 1, textAlign: 'right' }}>
              {r.value}
            </T>
          ) : (
            r.value
          )}
        </View>
      ))}
    </View>
  );
}

// ---------------------------------------------------------------------------
// Sheet
// ---------------------------------------------------------------------------

export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.scrim} onPress={onClose} accessibilityLabel="Close" />
      <View style={styles.sheet}>
        <View style={styles.grabber} />
        <Row style={{ justifyContent: 'space-between', marginBottom: space.md }}>
          <T v="title">{title}</T>
          <IconButton label="Close" onPress={onClose}>
            <X size={22} color={colors.textSecondary} />
          </IconButton>
        </Row>
        {children}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  screenContent: { paddingHorizontal: screenGutter, paddingBottom: space.huge, gap: space.md },
  header: { flexDirection: 'row', alignItems: 'center', gap: space.sm, paddingTop: space.xs, paddingBottom: space.xs },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.card,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
  },
  sticky: {
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 14,
    paddingHorizontal: screenGutter,
    paddingBottom: 34,
    gap: space.sm,
  },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: space.xxl },
  empty: { alignItems: 'center', gap: space.sm, paddingVertical: space.huge, paddingHorizontal: space.lg },
  error: { backgroundColor: colors.dangerSoft, borderRadius: radius.md, padding: space.sm },
  button: {
    height: sizes.button,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: space.lg,
  },
  iconButton: { minWidth: sizes.touchMin, minHeight: sizes.touchMin, alignItems: 'center', justifyContent: 'center' },
  dot: {
    position: 'absolute',
    top: 4,
    right: 2,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotText: { color: colors.onAccent, fontFamily: fonts.bold, fontSize: 11 },
  chip: {
    height: sizes.chip,
    paddingHorizontal: space.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    justifyContent: 'center',
  },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  segmented: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 4,
  },
  segment: { flex: 1, height: 36, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center' },
  input: {
    height: sizes.input,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: space.md,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 16,
  },
  box: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.textMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.sm,
    minHeight: 56,
    paddingVertical: space.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  track: { width: 48, height: 28, borderRadius: 14, backgroundColor: colors.surfaceRaised, padding: 3, borderWidth: 1, borderColor: colors.border },
  knob: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.text },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    height: 24,
    paddingHorizontal: space.xs,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
    alignSelf: 'flex-start',
  },
  pill: { height: 24, borderRadius: radius.pill, paddingHorizontal: space.sm, justifyContent: 'center', alignSelf: 'flex-start' },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: space.md, paddingVertical: space.sm },
  scrim: { flex: 1, backgroundColor: 'rgba(5,5,6,0.7)' },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: screenGutter,
    paddingBottom: 40,
    paddingTop: space.xs,
    maxHeight: '90%',
  },
  grabber: { alignSelf: 'center', width: 40, height: 5, borderRadius: 3, backgroundColor: colors.border, marginBottom: space.sm },
});
