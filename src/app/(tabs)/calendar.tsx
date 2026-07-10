import { RefreshControl, SectionList, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useCheckConditions } from '@/hooks/useCheckConditions';
import { CalendarRow, groupByMonth, formatMonth } from '@/components/CalendarRow';
import { EmptyState } from '@/components/EmptyState';
import { colors, type, space } from '@/theme';

export default function CalendarScreen() {
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useCheckConditions();
  const sections = groupByMonth(data ?? []).map((g) => ({ title: formatMonth(g.month), data: g.items }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvasDark, paddingHorizontal: space.md }}>
      <SectionList
        sections={sections}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ paddingBottom: space.xxl }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.primary} />}
        renderSectionHeader={({ section }) => (
          <Text style={[type.displaySm, { color: colors.onDark, marginTop: space.lg, marginBottom: space.xs }]}>{section.title}</Text>
        )}
        renderItem={({ item }) => <CalendarRow item={item} onPress={() => router.push(`/thesis/${item.theses.id}`)} />}
        ListEmptyComponent={!isLoading ? (
          <EmptyState
            message={'확인할 일정이 아직 없어요.\n종목과 가설을 등록하면 실적발표일 같은\n확인 일정을 AI가 자동으로 찾아서 채워줘요.'}
            ctaLabel="종목 + 가설 등록"
            ctaHref="/holding/new"
          />
        ) : null}
      />
    </View>
  );
}
