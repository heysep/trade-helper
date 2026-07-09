import { Text, View } from 'react-native';
import { colors, type, space } from '@/theme';

export function StatCallout({ label, value }: { label: string; value: string }) {
  return (
    <View style={{ width: '48%', marginBottom: space.md }}>
      <Text style={[type.numberDisplay, { color: colors.primary }]}>{value}</Text>
      <Text style={[type.caption, { color: colors.muted, marginTop: 2 }]}>{label}</Text>
    </View>
  );
}
