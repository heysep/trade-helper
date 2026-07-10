import { FlatList, RefreshControl, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useCheckResults } from '@/hooks/useCheckResults';
import { CheckResultCard } from '@/components/CheckResultCard';
import { EmptyState } from '@/components/EmptyState';
import { DISCLAIMER } from '@/constants/brand';
import { colors, type, space } from '@/theme';

function todayLabel(): string {
  const d = new Date();
  const dow = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
  return `오늘 ${d.getMonth() + 1}/${d.getDate()} (${dow})`;
}

export default function ChecksScreen() {
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useCheckResults();
  return (
    <View style={{ flex: 1, backgroundColor: colors.canvasDark, padding: space.md }}>
      <Text style={[type.caption, { color: colors.muted, marginBottom: space.sm }]}>{todayLabel()}</Text>
      <FlatList
        data={data ?? []}
        keyExtractor={(r) => r.id}
        contentContainerStyle={{ paddingBottom: space.xxl }}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.primary} />}
        renderItem={({ item }) => <CheckResultCard item={item} onPress={() => router.push(`/thesis/${item.theses.id}`)} />}
        ListEmptyComponent={!isLoading ? (
          <EmptyState message={'오늘 점검 결과가 아직 없어요.\n점검은 장 마감 후 하루 1번 자동으로 돌아요.\n(국내 오후 5시 · 미국 다음날 아침)'} />
        ) : null}
        ListFooterComponent={(data ?? []).length > 0 ? (
          <Text style={[type.bodySm, { color: colors.muted, marginTop: space.lg }]}>{DISCLAIMER}</Text>
        ) : null}
      />
    </View>
  );
}
