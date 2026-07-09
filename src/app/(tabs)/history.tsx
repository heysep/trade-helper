import { ScrollView, Text, View } from 'react-native';
import { useStats } from '@/hooks/useStats';
import { StatCallout } from '@/components/StatCallout';
import { Card } from '@/components/Card';
import { colors, type, space } from '@/theme';

export default function HistoryScreen() {
  const { data: stats } = useStats();
  if (!stats) return null;
  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.canvasDark }} contentContainerStyle={{ padding: space.md }}>
      <Text style={[type.displaySm, { color: colors.onDark, marginBottom: space.lg }]}>내 투자 가설 통계</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <StatCallout label="전체 가설" value={String(stats.total)} />
        <StatCallout label="유효(진행중)" value={String(stats.active)} />
        <StatCallout label="성공" value={String(stats.success)} />
        <StatCallout label="실패" value={String(stats.fail)} />
        <StatCallout label="평균 유지 기간" value={stats.avgHoldingDays !== null ? `${stats.avgHoldingDays}일` : '—'} />
      </View>
      {stats.failedTheses.length > 0 && (
        <>
          <Text style={[type.titleLg, { color: colors.onDark, marginTop: space.lg, marginBottom: space.sm }]}>실패 가설 복기</Text>
          {stats.failedTheses.map((t) => (
            <Card key={t.id} style={{ marginBottom: space.sm }}>
              <Text style={[type.bodyMd, { color: colors.body }]} numberOfLines={2}>{t.buy_reason}</Text>
              <Text style={[type.bodySm, { color: colors.tradingDown, marginTop: space.xxs }]}>깨진 조건: {t.break_conditions}</Text>
            </Card>
          ))}
        </>
      )}
    </ScrollView>
  );
}
