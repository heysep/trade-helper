import { useState } from 'react';
import { Pressable, RefreshControl, SectionList, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useCheckConditions } from '@/hooks/useCheckConditions';
import { useMarketEvents } from '@/hooks/useMarketEvents';
import { CalendarRow, mergeCalendar, groupByMonth, formatMonth } from '@/components/CalendarRow';
import { EmptyState } from '@/components/EmptyState';
import { colors, type, space, radius } from '@/theme';

export default function CalendarScreen() {
  const router = useRouter();
  const [onlyImportant, setOnlyImportant] = useState(false);
  const { data: mine, isLoading, refetch, isRefetching } = useCheckConditions();
  const { data: market, refetch: refetchMarket } = useMarketEvents();
  const merged = mergeCalendar(mine ?? [], market ?? []);
  const visible = onlyImportant ? merged.filter((i) => i.starred) : merged;
  const sections = groupByMonth(visible).map((g) => ({ title: formatMonth(g.month), data: g.items }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvasDark, paddingHorizontal: space.md }}>
      <View style={{ flexDirection: 'row', gap: space.xs, marginTop: space.sm }}>
        {([['all', '전체'], ['imp', '★ 중요만']] as const).map(([key, label]) => {
          const active = (key === 'imp') === onlyImportant;
          return (
            <Pressable key={key} onPress={() => setOnlyImportant(key === 'imp')}
              style={{ paddingHorizontal: 14, paddingVertical: 7, borderRadius: radius.pill,
                backgroundColor: active ? colors.primary : colors.surfaceCardDark }}>
              <Text style={[type.titleSm, { color: active ? colors.onPrimary : colors.mutedStrong }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingBottom: space.xxl }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => { refetch(); refetchMarket(); }} tintColor={colors.primary} />}
        renderSectionHeader={({ section }) => (
          <Text style={[type.displaySm, { color: colors.onDark, marginTop: space.lg, marginBottom: space.xs }]}>{section.title}</Text>
        )}
        renderItem={({ item }) => (
          <CalendarRow item={item} onPress={item.thesisId ? () => router.push(`/thesis/${item.thesisId}`) : undefined} />
        )}
        ListEmptyComponent={!isLoading ? (
          <EmptyState
            message={'확인할 일정이 아직 없어요.\n종목과 가설을 등록하면 실적발표일 같은\n확인 일정을 AI가 자동으로 찾아서 채워줘요.'}
            ctaLabel="종목 + 가설 등록"
            ctaHref="/holding/new"
          />
        ) : null}
        ListFooterComponent={merged.some((i) => i.kind === 'market') ? (
          <Text style={[type.caption, { color: colors.muted, marginTop: space.md }]}>
            파란 배지 = 시장 공통 일정 (자동 수집) · ★ = 중요
          </Text>
        ) : null}
      />
    </View>
  );
}
