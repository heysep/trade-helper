import { View, Text } from 'react-native';
import { colors, type, space } from '@/theme';

export default function ChecksScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.canvasDark, padding: space.md }}>
      <Text style={[type.bodyMd, { color: colors.muted }]}>오늘의 점검 결과가 여기 표시됩니다.</Text>
    </View>
  );
}
