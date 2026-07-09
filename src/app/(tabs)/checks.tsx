import { FlatList, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useCheckResults } from '@/hooks/useCheckResults';
import { CheckResultCard } from '@/components/CheckResultCard';
import { DISCLAIMER } from '@/constants/brand';
import { colors, type, space } from '@/theme';

export default function ChecksScreen() {
  const router = useRouter();
  const { data, isLoading } = useCheckResults();
  return (
    <View style={{ flex: 1, backgroundColor: colors.canvasDark, padding: space.md }}>
      <FlatList
        data={data ?? []}
        keyExtractor={(r) => r.id}
        renderItem={({ item }) => <CheckResultCard item={item} onPress={() => router.push(`/thesis/${item.theses.id}`)} />}
        ListEmptyComponent={!isLoading ? (
          <Text style={[type.bodyMd, { color: colors.muted, textAlign: 'center', marginTop: space.xl }]}>
            오늘 점검 결과가 아직 없습니다. 점검은 장 마감 후 하루 1회 자동 실행됩니다.
          </Text>
        ) : null}
        ListFooterComponent={<Text style={[type.bodySm, { color: colors.muted, marginTop: space.lg }]}>{DISCLAIMER}</Text>}
      />
    </View>
  );
}
