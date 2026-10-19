// Fadez2Go design tokens. Source of truth for the Expo app UI.
// Mockups: https://claude.ai/artifact/GBkQJrVkfLpW2F3UNNMnix
// Fonts: npx expo install @expo-google-fonts/anton @expo-google-fonts/archivo expo-font
// The app is dark-only in v1 (set "userInterfaceStyle": "dark" in app.json).

export const colors = {
  bg: '#0D0D0F',
  surface: '#17171B',
  surfaceRaised: '#1F1F25',
  border: '#2C2C34',
  scrim: '#050506',

  text: '#F5F2EA',
  textSecondary: '#B4B1A8',
  textMuted: '#8C8A83',

  accent: '#FF5A1F', // "Fade" orange: primary CTA, active tab, selected chips, own chat bubbles
  accentPressed: '#E0480F',
  accentSoft: '#3A1E14', // selected chip / option background (with accent border)
  onAccent: '#0D0D0F', // text and icons on accent

  verified: '#5AB0FF', // avatar ring + badge text for gym-verified fighters
  verifiedSoft: '#13263A',

  success: '#34D399', // "Locked in" (accepted)
  successSoft: '#10302A',
  warning: '#FBBF24', // "Pending" / waiting on you
  warningSoft: '#3A2F10',
  danger: '#F2556B', // block, report, destructive
  dangerSoft: '#3A1520',

  // Segmented control: selected segment is inverted
  segmentSelectedBg: '#F5F2EA',
  segmentSelectedText: '#0D0D0F',
} as const;

export const fonts = {
  display: 'Anton_400Regular', // always uppercase
  regular: 'Archivo_400Regular',
  medium: 'Archivo_500Medium',
  semibold: 'Archivo_600SemiBold',
  bold: 'Archivo_700Bold',
} as const;

export const type = {
  displayXL: { fontFamily: fonts.display, fontSize: 44, lineHeight: 48, letterSpacing: 0.5, textTransform: 'uppercase' },
  displayL: { fontFamily: fonts.display, fontSize: 32, lineHeight: 36, letterSpacing: 0.5, textTransform: 'uppercase' },
  screenTitle: { fontFamily: fonts.display, fontSize: 36, lineHeight: 40, textTransform: 'uppercase' },
  title: { fontFamily: fonts.semibold, fontSize: 22, lineHeight: 28 },
  headline: { fontFamily: fonts.semibold, fontSize: 17, lineHeight: 22 },
  body: { fontFamily: fonts.regular, fontSize: 16, lineHeight: 22 },
  bodySmall: { fontFamily: fonts.regular, fontSize: 15, lineHeight: 21 },
  callout: { fontFamily: fonts.medium, fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: fonts.medium, fontSize: 13, lineHeight: 18 },
  overline: { fontFamily: fonts.semibold, fontSize: 11, lineHeight: 14, letterSpacing: 1.5, textTransform: 'uppercase' },
  button: { fontFamily: fonts.bold, fontSize: 16, lineHeight: 20 },
} as const;

export const space = { xxs: 4, xs: 8, sm: 12, md: 16, lg: 20, xl: 24, xxl: 32, xxxl: 40, huge: 56 } as const;
export const screenGutter = 20;

export const radius = { sm: 8, md: 12, card: 16, lg: 20, pill: 999 } as const;

export const sizes = {
  touchMin: 44,
  button: 52,
  input: 48,
  chip: 36,
  tabBar: 84, // including home indicator inset
  avatar: { sm: 40, md: 48, card: 56, lg: 88, hero: 104 },
  avatarRing: { verified: 2, hero: 3 },
} as const;

// Fade status → pill style. Keep labels exactly as written; the decline label is deliberately soft.
export const fadeStatus = {
  pending: { label: 'Pending', bg: colors.warningSoft, fg: colors.warning },
  accepted: { label: 'Locked in', bg: colors.successSoft, fg: colors.success },
  declined: { label: 'Not this time', bg: colors.surfaceRaised, fg: colors.textSecondary },
  cancelled: { label: 'Called off', bg: colors.surfaceRaised, fg: colors.textSecondary },
  expired: { label: 'Expired', bg: colors.surfaceRaised, fg: colors.textSecondary },
  completed: { label: 'Done', bg: colors.successSoft, fg: colors.success },
} as const;

export const theme = { colors, fonts, type, space, radius, sizes, fadeStatus, screenGutter };
export type Theme = typeof theme;
