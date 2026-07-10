import { useEffect } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useSignalsUnread } from '@/hooks/useSignals';
import { Card } from '@/components/Card';
import { EmptyState } from '@/components/EmptyState';
import type { CheckResultItem } from '@/hooks/useCheckResults';
import { colors, type, space, radius } from '@/theme';

function signalMeta(item: CheckResultItem): { label: string; color: string } {
  if (item.add_signal) return { label: '추가매수 조건 달성', color: colors.primary };
  if (item.opinion === 'exit') return { label: '청산 신호', color: colors.tradingDown };
  if (item.opinion === 'reduce') return { label: '축소 신호', color: colors.tradingDown };
  return { label: '관점 흔들림 (관찰)', color: colors.statusReduce };
}

function fmtDate(d: string): string {
  return `${parseInt(d.slice(5, 7), 10)}/${parseInt(d.slice(8, 10), 10)}`;
}

export default function AlertsScreen() {
  const router = useRouter();
  const { signals, markSeen } = useSignalsUnread();

  // 화면 진입 = 읽음 처리
  useEffect(() => { markSeen(); }, [markSeen]);

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvasDark, padding: space.md }}>
      <Stack.Screen options={{ title: '알림' }} />
      <FlatList
        data={signals}
        keyExtractor={(s) => s.id}
        contentContainerStyle={{ paddingBottom: space.xxl }}
        renderItem={({ item }) => {
          const meta = signalMeta(item);
          return (
            <Pressable onPress={() => router.push(`/thesis/${item.theses.id}`)}>
              <Card style={{ marginBottom: space.sm }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.xs }}>
                  <View style={{ backgroundColor: meta.color + '1F', borderRadius: radius.pill, paddingHorizontal: 10, paddingVertical: 4 }}>
                    <Text style={[type.titleSm, { color: meta.color }]}>{meta.label}</Text>
                  </View>
                  <Text style={[type.numberSm, { color: colors.muted }]}>{fmtDate(item.check_date)}</Text>
                </View>
                <Text style={[type.titleSm, { color: colors.onDark, marginBottom: space.xxs }]}>{item.theses.holdings.name}</Text>
                <Text style={[type.bodyMd, { color: colors.body }]} numberOfLines={3}>{item.rationale}</Text>
              </Card>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <EmptyState message={'최근 7일간 행동 신호가 없어요.\n추가매수 조건 달성, 관점 흔들림·청산 신호가\n생기면 여기에 모아서 보여드려요.'} />
        }
      />
    </View>
  );
}
