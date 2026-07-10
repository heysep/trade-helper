import { RefreshControl, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useCheckResults, CheckResultItem } from '@/hooks/useCheckResults';
import { CheckResultCard } from '@/components/CheckResultCard';
import { EmptyState } from '@/components/EmptyState';
import { DISCLAIMER } from '@/constants/brand';
import { colors, type, space } from '@/theme';

function todayLabel(): string {
  const d = new Date();
  const dow = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
  return `오늘 ${d.getMonth() + 1}/${d.getDate()} (${dow})`;
}

/** 점검 결과 3분류: 추가매수 타이밍 / 관점 흔들림 / 관점 유지 */
export function groupResults(items: CheckResultItem[]) {
  return {
    addSignal: items.filter((r) => r.add_signal),
    shaken: items.filter((r) => !r.add_signal && r.opinion !== 'hold'),
    holding: items.filter((r) => !r.add_signal && r.opinion === 'hold'),
  };
}

function Group({ title, color, items, onPress }: {
  title: string; color: string; items: CheckResultItem[]; onPress: (item: CheckResultItem) => void;
}) {
  if (!items.length) return null;
  return (
    <View style={{ marginBottom: space.md }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space.xs }}>
        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: color, marginRight: space.xs }} />
        <Text style={[type.titleSm, { color }]}>{title} ({items.length})</Text>
      </View>
      {items.map((item) => <CheckResultCard key={item.id} item={item} onPress={() => onPress(item)} />)}
    </View>
  );
}

export default function ChecksScreen() {
  const router = useRouter();
  const { data, isLoading, refetch, isRefetching } = useCheckResults();
  const groups = groupResults(data ?? []);
  const goto = (item: CheckResultItem) => router.push(`/thesis/${item.theses.id}`);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: colors.canvasDark }}
      contentContainerStyle={{ padding: space.md, paddingBottom: space.xxl }}
      refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor={colors.primary} />}
    >
      <Text style={[type.caption, { color: colors.muted, marginBottom: space.sm }]}>{todayLabel()}</Text>
      {(data ?? []).length === 0 && !isLoading ? (
        <EmptyState message={'오늘 점검 결과가 아직 없어요.\n점검은 장 마감 후 하루 1번 자동으로 돌아요.\n(국내 오후 5시 · 미국 다음날 아침)'} />
      ) : (
        <>
          <Group title="추가매수 타이밍" color={colors.primary} items={groups.addSignal} onPress={goto} />
          <Group title="관점 흔들림" color={colors.tradingDown} items={groups.shaken} onPress={goto} />
          <Group title="관점 유지" color={colors.tradingUp} items={groups.holding} onPress={goto} />
          <Text style={[type.bodySm, { color: colors.muted, marginTop: space.sm }]}>{DISCLAIMER}</Text>
        </>
      )}
    </ScrollView>
  );
}
