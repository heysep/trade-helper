import { FlatList, RefreshControl, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useHoldings } from '@/hooks/useHoldings';
import { useTheses } from '@/hooks/useTheses';
import { HoldingCard } from '@/components/HoldingCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { EmptyState } from '@/components/EmptyState';
import { colors, space } from '@/theme';
import type { Opinion } from '@/components/StatusBadge';

const STATUS_TO_OPINION: Record<string, Opinion> = { active: 'hold', watching: 'watch', reduce: 'reduce', exit: 'exit' };

export default function HoldingsScreen() {
  const router = useRouter();
  const { data: holdings, isLoading, refetch, isRefetching } = useHoldings();
  const { data: theses, refetch: refetchTheses } = useTheses();

  const activeThesis = (holdingId: string) =>
    (theses ?? []).find((t) => t.holding_id === holdingId && t.status !== 'closed');

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvasDark, padding: space.md }}>
      <FlatList
        data={holdings ?? []}
        keyExtractor={(h) => h.id}
        contentContainerStyle={{ paddingBottom: space.xxl }}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => { refetch(); refetchTheses(); }} tintColor={colors.primary} />
        }
        renderItem={({ item }) => {
          const active = activeThesis(item.id);
          return (
            <HoldingCard
              holding={item}
              latestStatus={active ? STATUS_TO_OPINION[active.status] ?? null : null}
              onPress={() => active
                ? router.push(`/thesis/${active.id}`)
                : router.push({ pathname: '/thesis/new', params: { holdingId: item.id } })}
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
