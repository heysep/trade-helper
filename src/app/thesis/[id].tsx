import { useEffect, useRef } from 'react';
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

const VERDICT_COLOR: Record<string, string> = { '타당': colors.tradingUp, '부분 타당': colors.statusWatch, '약함': colors.tradingDown };

function VerdictBadge({ verdict }: { verdict: string }) {
  const c = VERDICT_COLOR[verdict] ?? colors.muted;
  return (
    <View style={{ backgroundColor: c + '1F', borderRadius: 9999, paddingHorizontal: 10, paddingVertical: 3 }}>
      <Text style={[type.titleSm, { color: c }]}>{verdict}</Text>
    </View>
  );
}

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
  const autoStarted = useRef(false);

  // 등록 직후 진입하면 자동으로 AI 점검 시작 (버튼 한 번 더 누를 필요 없게)
  useEffect(() => {
    if (thesis && !thesis.soundness_review && thesis.status !== 'closed' && !autoStarted.current && !verify.isPending) {
      autoStarted.current = true;
      verify.mutate(id!, { onError: () => { /* 실패 시 수동 버튼 노출됨 */ } });
    }
  }, [thesis, id, verify]);

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
          <Text style={[type.titleMd, { color: colors.onDark, marginBottom: space.md }]}>AI 점검 결과</Text>

          {(thesis.soundness_review.reason_reviews ?? []).map((r, i) => (
            <View key={i} style={{ marginBottom: space.md, paddingBottom: space.md, borderBottomWidth: 1, borderBottomColor: colors.hairlineOnDark }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.xxs }}>
                <Text style={[type.titleSm, { color: colors.onDark, flex: 1, marginRight: space.xs }]}>{r.reason}</Text>
                <VerdictBadge verdict={r.verdict} />
              </View>
              <Text style={[type.bodyMd, { color: colors.body }]}>{r.comment}</Text>
            </View>
          ))}

          {/* 구버전 통짜 텍스트 호환 */}
          {!thesis.soundness_review.reason_reviews && thesis.soundness_review.soundness ? (
            <Text style={[type.bodyMd, { color: colors.body, marginBottom: space.md }]}>{thesis.soundness_review.soundness}</Text>
          ) : null}

          {(thesis.soundness_review.missing_points ?? []).length > 0 ? (
            <Section title="놓치고 있는 관점">
              {thesis.soundness_review.missing_points!.map((m, i) => (
                <Text key={i} style={[type.bodyMd, { color: colors.statusWatch, marginBottom: space.xxs }]}>· {m}</Text>
              ))}
            </Section>
          ) : null}

          <Section title="가설이 깨질 수 있는 경우">
            {thesis.soundness_review.counterpoints.map((c, i) => (
              <Text key={i} style={[type.bodyMd, { color: colors.tradingDown, marginBottom: space.xxs }]}>· {c}</Text>
            ))}
          </Section>

          <Pressable onPress={() => verify.mutate(id!, { onError: (e) => Alert.alert('검증 실패', e.message) })} disabled={verify.isPending}>
            <Text style={[type.button, { color: colors.primary, textAlign: 'center', paddingVertical: space.xs }]}>
              {verify.isPending ? '다시 점검 중…' : '다시 점검하기'}
            </Text>
          </Pressable>
        </Card>
      ) : verify.isPending ? (
        <Card style={{ marginBottom: space.lg, alignItems: 'center', paddingVertical: space.xl }}>
          <ActivityIndicator color={colors.primary} size="large" />
          <Text style={[type.titleSm, { color: colors.onDark, marginTop: space.md }]}>AI가 가설을 점검하고 있어요</Text>
          <Text style={[type.bodySm, { color: colors.muted, marginTop: space.xxs, textAlign: 'center' }]}>
            웹에서 최신 자료를 찾는 중입니다{'\n'}30초~1분 30초 정도 걸려요. 기다리는 동안 나가도 괜찮아요.
          </Text>
        </Card>
      ) : (
        <PrimaryButton
          title="AI 가설 점검 시작"
          onPress={() => verify.mutate(id!, { onError: (e) => Alert.alert('점검 실패', e.message) })}
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
