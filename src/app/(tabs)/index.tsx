import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useHoldings } from '@/hooks/useHoldings';
import { useTheses } from '@/hooks/useTheses';
import { useLatestResults } from '@/hooks/useLatestResults';
import { useStats } from '@/hooks/useStats';
import { HoldingCard } from '@/components/HoldingCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { EmptyState } from '@/components/EmptyState';
import { colors, type, space, radius } from '@/theme';
import type { Opinion } from '@/components/StatusBadge';

export default function HoldingsScreen() {
  const router = useRouter();
  const { data: holdings, isLoading, refetch, isRefetching } = useHoldings();
  const { data: theses, refetch: refetchTheses } = useTheses();
  const { data: latest, refetch: refetchLatest } = useLatestResults();
  const { data: stats } = useStats();

  const activeThesis = (holdingId: string) =>
    (theses ?? []).find((t) => t.holding_id === holdingId && t.status !== 'closed');

  const visibleHoldings = (holdings ?? []).filter((h) => activeThesis(h.id));
  const closedCount = (stats?.success ?? 0) + (stats?.fail ?? 0);

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvasDark, padding: space.md }}>
      {/* 가설 성적 요약 — 종료 가설이 생기면 나타남 (히스토리 진입점) */}
      {closedCount > 0 ? (
        <Pressable onPress={() => router.push('/history')}
          style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            backgroundColor: colors.surfaceCardDark, borderRadius: radius.lg, paddingHorizontal: space.md, paddingVertical: 10, marginBottom: space.sm }}>
          <Text style={[type.titleSm, { color: colors.mutedStrong }]}>
            가설 성적 · <Text style={{ color: colors.tradingUp }}>성공 {stats!.success}</Text> · <Text style={{ color: colors.tradingDown }}>실패 {stats!.fail}</Text>
          </Text>
          <Text style={[type.caption, { color: colors.primary }]}>복기 ›</Text>
        </Pressable>
      ) : null}

      <FlatList
        data={visibleHoldings}
        keyExtractor={(h) => h.id}
        contentContainerStyle={{ paddingBottom: space.xxl }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => { refetch(); refetchTheses(); refetchLatest(); }} tintColor={colors.primary} />
        }
        renderItem={({ item }) => {
          const active = activeThesis(item.id)!;
          const result = latest?.get(active.id);
          // 최신 점검 의견이 있으면 그걸로, 없으면 '점검 전' (감사 H1: theses.status는 배지 소스로 부적합)
          const opinion: Opinion | null = result ? result.opinion : null;
          return (
            <HoldingCard
              holding={item}
              latestStatus={opinion}
              score={active.soundness_review?.score ?? null}
              checkedAt={result?.check_date ?? null}
              onPress={() => router.push(`/thesis/${active.id}`)}
            />
          );
        }}
        ListEmptyComponent={!isLoading ? (
          <EmptyState message={'아직 등록한 종목이 없어요.\n"왜 샀는지"를 기록하면 AI가 매일 대신 점검해 드려요.'} />
        ) : null}
      />
      <PrimaryButton title="종목 + 가설 등록" onPress={() => router.push('/holding/new')} />
    </View>
  );
}
