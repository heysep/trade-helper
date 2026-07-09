import { ScrollView, Text, View, ActivityIndicator, Alert, Pressable } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useThesis, useCloseThesis } from '@/hooks/useTheses';
import { useHoldings } from '@/hooks/useHoldings';
import { useVerifyThesis } from '@/hooks/useVerifyThesis';
import { PriceChart } from '@/components/PriceChart';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { DISCLAIMER } from '@/constants/brand';
import { colors, type, space } from '@/theme';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: space.lg }}>
      <Text style={[type.titleSm, { color: colors.muted, marginBottom: space.xxs }]}>{title}</Text>
      {children}
    </View>
  );
}

export default function ThesisDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: thesis, isLoading } = useThesis(id!);
  const { data: holdings } = useHoldings();
  const verify = useVerifyThesis();
  const close = useCloseThesis();

  const confirmClose = () => {
    Alert.alert('가설 종료', '이 가설의 결과를 기록합니다. 종료 후 히스토리에서 복기할 수 있어요.', [
      { text: '성공으로 기록', onPress: () => close.mutate({ thesisId: id!, outcome: 'success' }) },
      { text: '실패로 기록', style: 'destructive', onPress: () => close.mutate({ thesisId: id!, outcome: 'fail' }) },
      { text: '취소', style: 'cancel' },
    ]);
  };

  if (isLoading || !thesis) return <ActivityIndicator style={{ marginTop: space.xl }} color={colors.primary} />;
  const holding = (holdings ?? []).find((h) => h.id === thesis.holding_id);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.canvasDark }} contentContainerStyle={{ padding: space.md }}>
      <Stack.Screen options={{ title: holding ? `${holding.name} 가설` : '가설' }} />
      {holding && <View style={{ marginBottom: space.lg }}><PriceChart ticker={holding.ticker} market={holding.market} /></View>}

      <Card style={{ marginBottom: space.lg }}>
        <Section title="매수 이유">
          <Text style={[type.bodyMd, { color: colors.body }]}>{thesis.buy_reason}</Text>
        </Section>
        <Section title="깨지는 조건">
          <Text style={[type.bodyMd, { color: colors.body }]}>{thesis.break_conditions}</Text>
        </Section>
        {thesis.add_conditions ? (
          <Section title="추가매수 조건">
            <Text style={[type.bodyMd, { color: colors.body }]}>{thesis.add_conditions}</Text>
          </Section>
        ) : null}
        <Section title="목표 보유 기간">
          <Text style={[type.bodyMd, { color: colors.body }]}>{thesis.target_horizon}</Text>
        </Section>
      </Card>

      {thesis.soundness_review ? (
        <Card style={{ marginBottom: space.lg }}>
          <Section title="AI 합당성 평가">
            <Text style={[type.bodyMd, { color: colors.body }]}>{thesis.soundness_review.soundness}</Text>
          </Section>
          <Section title="반박 포인트">
            {thesis.soundness_review.counterpoints.map((c, i) => (
              <Text key={i} style={[type.bodyMd, { color: colors.tradingDown, marginBottom: space.xxs }]}>· {c}</Text>
            ))}
          </Section>
        </Card>
      ) : (
        <PrimaryButton
          title={verify.isPending ? '검증 중… (수십 초 걸릴 수 있어요)' : 'AI 가설 검증'}
          disabled={verify.isPending}
          onPress={() => verify.mutate(id!, { onError: (e) => Alert.alert('검증 실패', e.message) })}
        />
      )}
      {thesis.status !== 'closed' ? (
        <Pressable onPress={confirmClose} disabled={close.isPending}
          style={{ marginTop: space.lg, alignItems: 'center', paddingVertical: space.sm, borderRadius: 6, borderWidth: 1, borderColor: colors.hairlineOnDark }}>
          <Text style={[type.button, { color: colors.mutedStrong }]}>{close.isPending ? '기록 중…' : '가설 종료 (성공/실패 기록)'}</Text>
        </Pressable>
      ) : (
        <Text style={[type.titleSm, { color: thesis.outcome === 'success' ? colors.tradingUp : colors.tradingDown, marginTop: space.lg, textAlign: 'center' }]}>
          {thesis.outcome === 'success' ? '성공으로 종료된 가설' : '실패로 종료된 가설'} · 히스토리에서 복기
        </Text>
      )}
      <Text style={[type.bodySm, { color: colors.muted, marginTop: space.lg }]}>{DISCLAIMER}</Text>
    </ScrollView>
  );
}
