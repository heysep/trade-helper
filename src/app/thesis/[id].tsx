import { ScrollView, Text, View, ActivityIndicator, Alert } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useThesis } from '@/hooks/useTheses';
import { useHoldings } from '@/hooks/useHoldings';
import { useVerifyThesis } from '@/hooks/useVerifyThesis';
import { TVChart } from '@/components/TVChart';
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

  if (isLoading || !thesis) return <ActivityIndicator style={{ marginTop: space.xl }} color={colors.primary} />;
  const holding = (holdings ?? []).find((h) => h.id === thesis.holding_id);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.canvasDark }} contentContainerStyle={{ padding: space.md }}>
      <Stack.Screen options={{ title: holding ? `${holding.name} 가설` : '가설' }} />
      {holding && <View style={{ marginBottom: space.lg }}><TVChart ticker={holding.ticker} market={holding.market} /></View>}

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
      <Text style={[type.bodySm, { color: colors.muted, marginTop: space.lg }]}>{DISCLAIMER}</Text>
    </ScrollView>
  );
}
