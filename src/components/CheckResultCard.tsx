import { Pressable, Text, View } from 'react-native';
import { Card } from './Card';
import { StatusBadge } from './StatusBadge';
import { colors, type, space } from '@/theme';
import type { CheckResultItem } from '@/hooks/useCheckResults';

export function CheckResultCard({ item, onPress }: { item: CheckResultItem; onPress: () => void }) {
  return (
    <Pressable onPress={onPress}>
      <Card style={{ marginBottom: space.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.xs }}>
          <Text style={[type.titleMd, { color: colors.onDark }]}>{item.theses.holdings.name}</Text>
          <StatusBadge status={item.opinion} />
        </View>
        <Text style={[type.bodyMd, { color: colors.body }]}>{item.rationale}</Text>
      </Card>
    </Pressable>
  );
}
