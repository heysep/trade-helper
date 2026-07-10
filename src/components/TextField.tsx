import { View, Text, TextInput } from 'react-native';
import { colors, type, radius, space } from '@/theme';

export function TextField({ label, value, onChangeText, placeholder, multiline, autoCapitalize }: {
  label: string; value: string; onChangeText: (t: string) => void; placeholder?: string; multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  return (
    <View style={{ marginBottom: space.md }}>
      <Text style={[type.caption, { color: colors.muted, marginBottom: space.xxs }]}>{label}</Text>
      <TextInput
        value={value} onChangeText={onChangeText} placeholder={placeholder} multiline={multiline}
        autoCapitalize={autoCapitalize} autoCorrect={false}
        placeholderTextColor={colors.muted}
        style={[type.bodyMd, {
          backgroundColor: colors.canvasLight, color: colors.ink, borderWidth: 1, borderColor: colors.hairlineOnLight,
          borderRadius: radius.md, paddingHorizontal: 16, minHeight: multiline ? 96 : 48, textAlignVertical: multiline ? 'top' : 'center',
        }]}
      />
    </View>
  );
}
