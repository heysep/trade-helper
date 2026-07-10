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
          <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, flex: 1 }}>
            <Text style={[type.titleMd, { color: colors.onDark }]}>{item.theses.holdings.name}</Text>
            <Text style={[type.caption, { color: colors.muted }]}>{item.check_date.slice(5).replace('-', '.')}</Text>
          </View>
          <StatusBadge status={item.opinion} />
        </View>
        <Text style={[type.bodyMd, { color: colors.body }]}>{item.rationale}</Text>
      </Card>
    </Pressable>
  );
}
