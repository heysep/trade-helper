import { FlatList, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useHoldings } from '@/hooks/useHoldings';
import { useTheses } from '@/hooks/useTheses';
import { HoldingCard } from '@/components/HoldingCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, type, space } from '@/theme';
import type { Opinion } from '@/components/StatusBadge';

const STATUS_TO_OPINION: Record<string, Opinion> = { active: 'hold', watching: 'watch', reduce: 'reduce', exit: 'exit' };

export default function HoldingsScreen() {
  const router = useRouter();
  const { data: holdings, isLoading } = useHoldings();
  const { data: theses } = useTheses();

  const activeThesis = (holdingId: string) =>
    (theses ?? []).find((t) => t.holding_id === holdingId && t.status !== 'closed');

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvasDark, padding: space.md }}>
      <FlatList
        data={holdings ?? []}
        keyExtractor={(h) => h.id}
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
          <Text style={[type.bodyMd, { color: colors.muted, textAlign: 'center', marginTop: space.xl }]}>
            종목을 등록하고 매수 가설을 기록해 보세요.
          </Text>
        ) : null}
      />
      <PrimaryButton title="종목 추가" onPress={() => router.push('/holding/new')} />
    </View>
  );
}
