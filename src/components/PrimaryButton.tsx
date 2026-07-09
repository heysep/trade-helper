import { Pressable, Text, StyleSheet } from 'react-native';
import { colors, type, radius } from '@/theme';

export function PrimaryButton({ title, onPress, disabled, pill }: {
  title: string; onPress: () => void; disabled?: boolean; pill?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      accessibilityState={{ disabled: !!disabled }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        { borderRadius: pill ? radius.pill : radius.md },
        pressed && !disabled && { backgroundColor: colors.primaryActive },
        disabled && { backgroundColor: colors.primaryDisabled },
      ]}
    >
      <Text style={[type.button, { color: disabled ? colors.muted : colors.onPrimary }]}>{title}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: { backgroundColor: colors.primary, height: 48, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center' },
});
