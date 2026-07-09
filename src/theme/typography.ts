import type { TextStyle } from 'react-native';

export const fontFamilies = {
  sans: 'Inter_400Regular', sansMedium: 'Inter_500Medium', sansSemiBold: 'Inter_600SemiBold', sansBold: 'Inter_700Bold',
  mono: 'IBMPlexMono_500Medium', monoBold: 'IBMPlexMono_700Bold',
} as const;

const t = (s: Partial<TextStyle>): TextStyle => s as TextStyle;

export const type = {
  heroDisplay: t({ fontFamily: fontFamilies.sansBold, fontSize: 34, lineHeight: 39, letterSpacing: -0.5 }),
  displayLg: t({ fontFamily: fontFamilies.sansBold, fontSize: 28, lineHeight: 32, letterSpacing: -0.3 }),
  displayMd: t({ fontFamily: fontFamilies.sansSemiBold, fontSize: 24, lineHeight: 29 }),
  displaySm: t({ fontFamily: fontFamilies.sansSemiBold, fontSize: 20, lineHeight: 25 }),
  titleLg: t({ fontFamily: fontFamilies.sansSemiBold, fontSize: 18, lineHeight: 23 }),
  titleMd: t({ fontFamily: fontFamilies.sansSemiBold, fontSize: 16, lineHeight: 22 }),
  titleSm: t({ fontFamily: fontFamilies.sansSemiBold, fontSize: 14, lineHeight: 20 }),
  numberDisplay: t({ fontFamily: fontFamilies.monoBold, fontSize: 32, lineHeight: 35, letterSpacing: -0.3, fontVariant: ['tabular-nums'] }),
  numberMd: t({ fontFamily: fontFamilies.mono, fontSize: 15, lineHeight: 21, fontVariant: ['tabular-nums'] }),
  numberSm: t({ fontFamily: fontFamilies.mono, fontSize: 13, lineHeight: 18, fontVariant: ['tabular-nums'] }),
  bodyMd: t({ fontFamily: fontFamilies.sans, fontSize: 14, lineHeight: 21 }),
  bodySm: t({ fontFamily: fontFamilies.sans, fontSize: 13, lineHeight: 19 }),
  caption: t({ fontFamily: fontFamilies.sansMedium, fontSize: 12, lineHeight: 17 }),
  button: t({ fontFamily: fontFamilies.sansSemiBold, fontSize: 15, lineHeight: 15 }),
  navLink: t({ fontFamily: fontFamilies.sansMedium, fontSize: 12, lineHeight: 16 }),
} as const;
