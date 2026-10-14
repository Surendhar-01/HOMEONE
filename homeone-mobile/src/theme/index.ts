/**
 * HOMEONE design tokens.
 * Light theme only: white background, deep blue primary, subtle teal accents.
 */
export const colors = {
  background: '#FFFFFF',
  surface: '#F8FAFC',
  card: '#FFFFFF',
  border: '#E2E8F0',
  text: '#0F172A',
  textSecondary: '#64748B',
  textMuted: '#94A3B8',

  primary: '#1D4ED8',
  primaryDark: '#1E40AF',
  primaryLight: '#DBEAFE',

  teal: '#0D9488',
  tealLight: '#CCFBF1',

  success: '#15803D',
  successBg: '#DCFCE7',
  warning: '#B45309',
  warningBg: '#FEF3C7',
  error: '#DC2626',
  errorBg: '#FEE2E2',
  info: '#1D4ED8',
  infoBg: '#DBEAFE',

  disabled: '#CBD5E1',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

export const typography = {
  display: { fontSize: 32, fontWeight: '800' as const, lineHeight: 40 },
  h1: { fontSize: 26, fontWeight: '700' as const, lineHeight: 34 },
  h2: { fontSize: 20, fontWeight: '700' as const, lineHeight: 28 },
  h3: { fontSize: 16, fontWeight: '700' as const, lineHeight: 24 },
  body: { fontSize: 15, fontWeight: '400' as const, lineHeight: 22 },
  bodySmall: { fontSize: 13, fontWeight: '400' as const, lineHeight: 19 },
  label: { fontSize: 13, fontWeight: '600' as const, lineHeight: 18 },
  button: { fontSize: 16, fontWeight: '700' as const, lineHeight: 22 },
  caption: { fontSize: 12, fontWeight: '400' as const, lineHeight: 16 },
} as const;

export const shadows = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  button: {
    shadowColor: '#1D4ED8',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
} as const;
