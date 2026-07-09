import { View, Text } from 'react-native';
import { colors, type, space } from '@/theme';

export default function HistoryScreen() {
  return (
    <View style={{ flex: 1, backgroundColor: colors.canvasDark, padding: space.md }}>
      <Text style={[type.bodyMd, { color: colors.muted }]}>가설 통계가 여기 표시됩니다.</Text>
    </View>
  );
}
