import { View, Text } from 'react-native';
import { colors, type, radius } from '@/theme';

export type Opinion = 'hold' | 'watch' | 'reduce' | 'exit';
export const STATUS_LABEL: Record<Opinion, string> = { hold: '유지', watch: '관찰', reduce: '축소', exit: '청산' };
const STATUS_COLOR: Record<Opinion, string> = {
  hold: colors.statusHold, watch: colors.statusWatch, reduce: colors.statusReduce, exit: colors.statusExit,
};

export function StatusBadge({ status }: { status: Opinion }) {
  const c = STATUS_COLOR[status];
  return (
    <View style={{ backgroundColor: c + '1F', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' }}>
      <Text style={[type.titleSm, { color: c }]}>{STATUS_LABEL[status]}</Text>
    </View>
  );
}
