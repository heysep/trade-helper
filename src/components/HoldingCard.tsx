import { Pressable, Text, View } from 'react-native';
import { Card } from './Card';
import { StatusBadge, Opinion } from './StatusBadge';
import { scoreColor } from './ScoreRing';
import { colors, type, space } from '@/theme';
import type { Holding } from '@/types/db';

/** 홈 카드 — 이름·티커 + 최신 점검 의견·점수·점검일 (홈에서 바로 상태 파악) */
export function HoldingCard({ holding, latestStatus, score, checkedAt, onPress }: {
  holding: Holding; latestStatus: Opinion | null; score?: number | null; checkedAt?: string | null; onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress}>
      <Card style={{ marginBottom: space.sm }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View style={{ flex: 1, marginRight: space.sm }}>
            <Text style={[type.titleMd, { color: colors.onDark }]}>{holding.name}</Text>
            <Text style={[type.numberSm, { color: colors.muted, marginTop: 2 }]}>{holding.market}:{holding.ticker}</Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            {latestStatus ? <StatusBadge status={latestStatus} /> :
              <Text style={[type.caption, { color: colors.muted }]}>점검 전</Text>}
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6 }}>
              {typeof score === 'number' ? (
                <Text style={[type.numberSm, { color: scoreColor(score) }]}>{score}점</Text>
              ) : null}
              {checkedAt ? (
                <Text style={[type.caption, { color: colors.muted }]}>점검 {checkedAt.slice(5, 10).replace('-', '.')}</Text>
              ) : null}
            </View>
          </View>
        </View>
      </Card>
    </Pressable>
  );
}
