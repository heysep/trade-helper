import { View, Text } from 'react-native';
import { colors, type, space } from '@/theme';

export default function HoldingsScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.canvasDark, padding: space.md }}>
      <Text style={[type.bodyMd, { color: colors.muted }]}>등록한 종목이 여기 표시됩니다.</Text>
    </View>
  );
}
