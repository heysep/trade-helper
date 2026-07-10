import { View, Text, TextInput } from 'react-native';
import { colors, type, radius, space } from '@/theme';

export function TextField({ label, value, onChangeText, placeholder, multiline, autoCapitalize, dark, maxLength }: {
  label: string; value: string; onChangeText: (t: string) => void; placeholder?: string; multiline?: boolean;
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters'; dark?: boolean; maxLength?: number;
}) {
  return (
    <View style={{ marginBottom: space.md }}>
      <Text style={[type.caption, { color: colors.muted, marginBottom: space.xxs }]}>{label}</Text>
      <TextInput
        value={value} onChangeText={onChangeText} placeholder={placeholder} multiline={multiline}
        autoCapitalize={autoCapitalize} autoCorrect={false} maxLength={maxLength ?? (multiline ? 1000 : 100)}
        placeholderTextColor={colors.muted}
        style={[type.bodyMd, {
          backgroundColor: dark ? colors.surfaceElevatedDark : colors.canvasLight,
          color: dark ? colors.body : colors.ink,
          borderWidth: 1, borderColor: dark ? colors.hairlineOnDark : colors.hairlineOnLight,
          borderRadius: radius.md, paddingHorizontal: 16, minHeight: multiline ? 96 : 48, textAlignVertical: multiline ? 'top' : 'center',
        }]}
      />
    </View>
  );
}
