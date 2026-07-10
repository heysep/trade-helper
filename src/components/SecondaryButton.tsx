import { ActivityIndicator, Pressable, Text } from 'react-native';
import { colors, type, radius } from '@/theme';

/** 다크 캔버스용 보조 버튼 — 카드 톤 배경 + 헤어라인, 주요 액션(gold)보다 한 단계 낮은 위계 */
export function SecondaryButton({ title, onPress, disabled, loading, accent }: {
  title: string; onPress: () => void; disabled?: boolean; loading?: boolean; accent?: boolean;
}) {
  const off = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      disabled={off}
      onPress={onPress}
      style={({ pressed }) => [{
        height: 44, borderRadius: radius.md, alignItems: 'center', justifyContent: 'center',
        flexDirection: 'row', gap: 8, marginTop: 8,
        backgroundColor: pressed && !off ? colors.surfaceElevatedDark : colors.surfaceCardDark,
        borderWidth: 1, borderColor: accent ? colors.primary + '66' : colors.hairlineOnDark,
      }]}
    >
      {loading ? <ActivityIndicator size="small" color={colors.primary} /> : null}
      <Text style={[type.button, { color: off ? colors.muted : accent ? colors.primary : colors.body }]}>{title}</Text>
    </Pressable>
  );
}
