import { Pressable, Text, View } from 'react-native';
import { Card } from './Card';
import { StatusBadge, Opinion } from './StatusBadge';
import { colors, type, space } from '@/theme';
import type { Holding } from '@/types/db';

export function HoldingCard({ holding, latestStatus, onPress }: {
  holding: Holding; latestStatus: Opinion | null; onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <Card style={{ marginBottom: space.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={[type.titleMd, { color: colors.onDark }]}>{holding.name}</Text>
            <Text style={[type.numberSm, { color: colors.muted, marginTop: 2 }]}>{holding.market}:{holding.ticker}</Text>
          </View>
          {latestStatus ? <StatusBadge status={latestStatus} /> :
            <Text style={[type.caption, { color: colors.muted }]}>가설 없음</Text>}
        </View>
      </Card>
    </Pressable>
  );
}
