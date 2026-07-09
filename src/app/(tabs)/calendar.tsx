import { View, Text } from 'react-native';
import { colors, type, space } from '@/theme';

export default function CalendarScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.canvasDark, padding: space.md }}>
      <Text style={[type.bodyMd, { color: colors.muted }]}>확인 일정이 여기 표시됩니다.</Text>
    </View>
  );
}
