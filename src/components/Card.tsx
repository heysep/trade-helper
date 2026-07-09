import { View, ViewStyle, StyleProp } from 'react-native';
import { colors, radius, space } from '@/theme';

export function Card({ children, mode = 'dark', style }: {
  children: React.ReactNode; mode?: 'dark' | 'light'; style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[{
      backgroundColor: mode === 'dark' ? colors.surfaceCardDark : colors.canvasLight,
      borderRadius: radius.xl, padding: space.lg,
      ...(mode === 'light' ? { borderWidth: 1, borderColor: colors.hairlineOnLight } : {}),
    }, style]}>
      {children}
    </View>
  );
}
