import { SectionList, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useCheckConditions } from '@/hooks/useCheckConditions';
import { CalendarRow, groupByMonth, formatMonth } from '@/components/CalendarRow';
import { colors, type, space } from '@/theme';

export default function CalendarScreen() {
  const router = useRouter();
  const { data, isLoading } = useCheckConditions();
  const sections = groupByMonth(data ?? []).map((g) => ({ title: formatMonth(g.month), data: g.items }));

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvasDark, paddingHorizontal: space.md }}>
      <SectionList
        sections={sections}
        keyExtractor={(i) => i.id}
        renderSectionHeader={({ section }) => (
          <Text style={[type.displaySm, { color: colors.onDark, marginTop: space.lg, marginBottom: space.xs }]}>{section.title}</Text>
        )}
        renderItem={({ item }) => <CalendarRow item={item} onPress={() => router.push(`/thesis/${item.theses.id}`)} />}
        ListEmptyComponent={!isLoading ? (
          <Text style={[type.bodyMd, { color: colors.muted, textAlign: 'center', marginTop: space.xl }]}>
            가설을 등록하고 AI 검증을 실행하면 확인 일정이 자동으로 추가됩니다.
          </Text>
        ) : null}
      />
    </View>
  );
}
