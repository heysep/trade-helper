import { RefreshControl, ScrollView, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useStats } from '@/hooks/useStats';
import { useTheses } from '@/hooks/useTheses';
import { useHoldings } from '@/hooks/useHoldings';
import { StatCallout } from '@/components/StatCallout';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import { colors, type, space, radius } from '@/theme';
import type { Thesis } from '@/types/db';

function outcomeMeta(t: Thesis): { label: string; color: string } {
  if (t.status !== 'closed') return { label: '진행중', color: colors.primary };
  if (t.outcome === 'success') return { label: '성공', color: colors.tradingUp };
  if (t.outcome === 'fail') return { label: '실패', color: colors.tradingDown };
  return { label: '종료', color: colors.muted };
}

function period(t: Thesis): string {
  const d = (s: string) => s.slice(0, 10).replaceAll('-', '.');
  return `${d(t.opened_at)} ~ ${t.closed_at ? d(t.closed_at) : '현재'}`;
}

export default function HistoryScreen() {
  const router = useRouter();
  const { data: stats, refetch, isRefetching } = useStats();
  const { data: theses, refetch: refetchTheses } = useTheses();
  const { data: holdings } = useHoldings();
  if (!stats) return null;

  const holdingName = (id: string) => (holdings ?? []).find((h) => h.id === id);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.canvasDark }}
      contentContainerStyle={{ padding: space.md, paddingBottom: space.xxl }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { refetch(); refetchTheses(); }} tintColor={colors.primary} />}
    >
      <Text style={[type.displaySm, { color: colors.onDark, marginBottom: space.lg }]}>내 투자 가설 통계</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <StatCallout label="전체 가설" value={String(stats.total)} />
        <StatCallout label="유효(진행중)" value={String(stats.active)} />
        <StatCallout label="성공" value={String(stats.success)} />
        <StatCallout label="실패" value={String(stats.fail)} />
        <StatCallout label="평균 유지 기간" value={stats.avgHoldingDays !== null ? `${stats.avgHoldingDays}일` : '—'} />
      </View>

      <Text style={[type.titleLg, { color: colors.onDark, marginTop: space.lg, marginBottom: space.sm }]}>가설 히스토리</Text>
      {(theses ?? []).map((t) => {
        const h = holdingName(t.holding_id);
        const meta = outcomeMeta(t);
        return (
          <Pressable key={t.id} onPress={() => router.push(`/thesis/${t.id}`)}>
            <Card style={{ marginBottom: space.sm }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.xxs }}>
                <Text style={[type.titleMd, { color: colors.onDark }]}>
                  {h ? h.name : '—'}{' '}
                  <Text style={[type.numberSm, { color: colors.muted }]}>{h ? `${h.market}:${h.ticker}` : ''}</Text>
                </Text>
                <View style={{ backgroundColor: meta.color + '1F', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={[type.titleSm, { color: meta.color }]}>{meta.label}</Text>
                </View>
              </View>
              <Text style={[type.numberSm, { color: colors.mutedStrong, marginBottom: space.xxs }]}>{period(t)}</Text>
              <Text style={[type.bodyMd, { color: colors.body }]} numberOfLines={2}>{t.buy_reason}</Text>
              {t.outcome === 'fail' ? (
                <Text style={[type.bodySm, { color: colors.tradingDown, marginTop: space.xxs }]} numberOfLines={2}>깨진 조건: {t.break_conditions}</Text>
              ) : null}
            </Card>
          </Pressable>
        );
      })}
      {(theses ?? []).length === 0 ? (
        <EmptyState
          message={'아직 기록한 가설이 없어요.\n가설을 쌓으면 성공/실패 패턴을 복기할 수 있어요.'}
          ctaLabel="첫 가설 기록하기"
          ctaHref="/holding/new"
        />
      ) : null}
    </ScrollView>
  );
}
