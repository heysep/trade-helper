import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { PrimaryButton } from './PrimaryButton';
import { colors, type, space } from '@/theme';

export function EmptyState({ message, ctaLabel, ctaHref }: {
  message: string; ctaLabel?: string; ctaHref?: string;
}) {
  const router = useRouter();
  return (
    <View style={{ alignItems: 'center', marginTop: space.section, paddingHorizontal: space.lg }}>
      <Text style={[type.bodyMd, { color: colors.muted, textAlign: 'center', marginBottom: space.lg }]}>{message}</Text>
      {ctaLabel && ctaHref ? <PrimaryButton title={ctaLabel} pill onPress={() => router.push(ctaHref as never)} /> : null}
    </View>
  );
}
