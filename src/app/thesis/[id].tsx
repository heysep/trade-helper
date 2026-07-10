import { useEffect, useRef, useState } from 'react';
import { ScrollView, Text, View, ActivityIndicator, Alert, Pressable } from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useThesis, useCloseThesis, useAppendThesisField, useUpdateThesis } from '@/hooks/useTheses';
import { useHoldings } from '@/hooks/useHoldings';
import { useThesisConditions } from '@/hooks/useCheckConditions';
import { useVerifyThesis, usePreviewVerify, useApplyVerify, useReviseThesis, VerifyResult, ReviseResult } from '@/hooks/useVerifyThesis';
import { PriceChart } from '@/components/PriceChart';
import { Card } from '@/components/Card';
import { PrimaryButton } from '@/components/PrimaryButton';
import { ScoreRing } from '@/components/ScoreRing';
import { TextField } from '@/components/TextField';
import { NumberedText } from '@/components/NumberedText';
import { DISCLAIMER } from '@/constants/brand';
import { colors, type, space, radius } from '@/theme';

const VERDICT_COLOR: Record<string, string> = { '타당': colors.tradingUp, '부분 타당': colors.statusWatch, '약함': colors.tradingDown };

function VerdictBadge({ verdict }: { verdict: string }) {
  const c = VERDICT_COLOR[verdict] ?? colors.muted;
  return (
    <View style={{ backgroundColor: c + '1F', borderRadius: 9999, paddingHorizontal: 10, paddingVertical: 3 }}>
      <Text style={[type.titleSm, { color: c }]}>{verdict}</Text>
    </View>
  );
}

const STATE_META: Record<string, { icon: string; color: string; label: string }> = {
  ok: { icon: '✓', color: colors.tradingUp, label: '정상' },
  warning: { icon: '!', color: colors.statusWatch, label: '주의' },
  broken: { icon: '✕', color: colors.tradingDown, label: '깨짐' },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={{ marginBottom: space.lg }}>
      <Text style={[type.titleSm, { color: colors.muted, marginBottom: space.xxs }]}>{title}</Text>
      {children}
    </View>
  );
}

function AdoptRow({ text, color, adopted, onAdopt }: { text: string; color: string; adopted: boolean; onAdopt: () => void }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: space.xs }}>
      <Text style={[type.bodyMd, { color, flex: 1 }]}>· {text}</Text>
      <Pressable onPress={onAdopt} disabled={adopted}
        style={{ marginLeft: space.xs, paddingHorizontal: 10, paddingVertical: 4, borderRadius: radius.pill,
          backgroundColor: adopted ? colors.surfaceElevatedDark : colors.primary + '1F' }}>
        <Text style={[type.caption, { color: adopted ? colors.muted : colors.primary }]}>{adopted ? '채택됨' : '채택'}</Text>
      </Pressable>
    </View>
  );
}

type Tab = 'ai' | 'watch' | 'mine';
const TABS: Array<{ key: Tab; label: string }> = [
  { key: 'mine', label: '내 가설' },
  { key: 'watch', label: '감시 항목' },
  { key: 'ai', label: 'AI 분석' },
];

export default function ThesisDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: thesis, isLoading } = useThesis(id!);
  const { data: holdings } = useHoldings();
  const { data: conditions } = useThesisConditions(id!);
  const verify = useVerifyThesis();
  const preview = usePreviewVerify();
  const applyVerify = useApplyVerify();
  const appendField = useAppendThesisField();
  const close = useCloseThesis();
  const updateThesis = useUpdateThesis();
  const reviseThesis = useReviseThesis();
  const autoStarted = useRef(false);
  const [pendingResult, setPendingResult] = useState<VerifyResult | null>(null);
  const [tab, setTab] = useState<Tab>('mine');
  const [editing, setEditing] = useState(false);
  const [eBuy, setEBuy] = useState('');
  const [eBreak, setEBreak] = useState('');
  const [eAdd, setEAdd] = useState('');
  const [eHorizon, setEHorizon] = useState('');
  const [revision, setRevision] = useState<ReviseResult | null>(null);

  const startEdit = () => {
    if (!thesis) return;
    setEBuy(thesis.buy_reason);
    setEBreak(thesis.break_conditions);
    setEAdd(thesis.add_conditions ?? '');
    setEHorizon(thesis.target_horizon);
    setEditing(true);
  };
  const saveEdit = () => {
    if (!eBuy.trim() || !eBreak.trim()) { Alert.alert('입력 확인', '매수 이유와 깨지는 조건은 비울 수 없어요.'); return; }
    updateThesis.mutate({
      thesisId: id!,
      fields: { buy_reason: eBuy.trim(), break_conditions: eBreak.trim(), add_conditions: eAdd.trim() || null, target_horizon: eHorizon.trim() },
    }, { onSuccess: () => setEditing(false), onError: (e) => Alert.alert('저장 실패', e.message) });
  };
  const askRevision = () => {
    reviseThesis.mutate(id!, {
      onSuccess: (r) => setRevision(r),
      onError: (e) => Alert.alert('수정안 실패', e.message),
    });
  };
  const applyRevision = () => {
    if (!revision) return;
    Alert.alert('수정안 적용', '내 가설이 이 수정안으로 바뀝니다. 적용할까요?', [
      { text: '적용', onPress: doApplyRevision },
      { text: '취소', style: 'cancel' },
    ]);
  };
  const doApplyRevision = () => {
    if (!revision) return;
    updateThesis.mutate({
      thesisId: id!,
      fields: { buy_reason: revision.buy_reason, break_conditions: revision.break_conditions, add_conditions: revision.add_conditions },
    }, {
      onSuccess: () => { setRevision(null); setTab('mine'); },
      onError: (e) => Alert.alert('적용 실패', e.message),
    });
  };

  useEffect(() => {
    if (thesis && !thesis.soundness_review && thesis.status !== 'closed' && !autoStarted.current && !verify.isPending) {
      autoStarted.current = true;
      verify.mutate(id!, { onError: () => {} });
    }
  }, [thesis, id, verify]);

  const startRecheck = () => {
    preview.mutate(id!, {
      onSuccess: (r) => setPendingResult(r),
      onError: (e) => Alert.alert('점검 실패', e.message),
    });
  };
  const confirmOverwrite = () => {
    if (!pendingResult) return;
    applyVerify.mutate({ thesisId: id!, result: pendingResult }, {
      onSuccess: () => setPendingResult(null),
      onError: (e) => Alert.alert('저장 실패', e.message),
    });
  };
  const confirmClose = () => {
    Alert.alert('가설 종료', '이 가설의 결과를 기록합니다. 종료 후 히스토리에서 복기할 수 있어요.', [
      { text: '성공으로 기록', onPress: () => close.mutate({ thesisId: id!, outcome: 'success' }) },
      { text: '실패로 기록', style: 'destructive', onPress: () => close.mutate({ thesisId: id!, outcome: 'fail' }) },
      { text: '취소', style: 'cancel' },
    ]);
  };

  if (isLoading || !thesis) return <ActivityIndicator style={{ marginTop: space.xl }} color={colors.primary} />;
  const holding = (holdings ?? []).find((h) => h.id === thesis.holding_id);
  const review = thesis.soundness_review;
  const adopt = (field: 'break_conditions' | 'add_conditions', text: string) =>
    appendField.mutate({ thesisId: id!, field, text, current: field === 'break_conditions' ? thesis.break_conditions : thesis.add_conditions });
  const isAdopted = (field: 'break_conditions' | 'add_conditions', text: string) =>
    ((field === 'break_conditions' ? thesis.break_conditions : thesis.add_conditions) ?? '').includes(text);

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.canvasDark }} contentContainerStyle={{ padding: space.md, paddingBottom: space.xxl }}>
      <Stack.Screen options={{ title: holding ? `${holding.name} 가설` : '가설' }} />
      {holding && <View style={{ marginBottom: space.md }}><PriceChart ticker={holding.ticker} market={holding.market} /></View>}

      {/* ── 점수 히어로 (고정 상단) ── */}
      {review && typeof review.score === 'number' ? (
        <View style={{ alignItems: 'center', marginBottom: space.md }}>
          <ScoreRing score={review.score} />
          {review.summary ? (
            <Text style={[type.titleSm, { color: colors.onDark, textAlign: 'center', marginTop: space.sm }]}>{review.summary}</Text>
          ) : null}
          <Text style={[type.caption, { color: colors.muted, marginTop: 2 }]}>AI의 주관적 점수 · 참고용</Text>
        </View>
      ) : null}

      {/* ── 재점검 미리보기 ── */}
      {pendingResult ? (
        <Card style={{ marginBottom: space.md, borderWidth: 1, borderColor: colors.primary }}>
          <Text style={[type.titleMd, { color: colors.primary, marginBottom: space.md }]}>새 점검 결과 (아직 저장 안 됨)</Text>
          <View style={{ alignItems: 'center', marginBottom: space.md }}>
            <ScoreRing score={pendingResult.score} />
            {pendingResult.summary ? (
              <Text style={[type.titleSm, { color: colors.onDark, textAlign: 'center', marginTop: space.md }]}>{pendingResult.summary}</Text>
            ) : null}
          </View>
          <PrimaryButton title={applyVerify.isPending ? '저장 중…' : '이 결과로 덮어쓰기'} disabled={applyVerify.isPending} onPress={confirmOverwrite} />
          <Pressable onPress={() => setPendingResult(null)} disabled={applyVerify.isPending}>
            <Text style={[type.button, { color: colors.muted, textAlign: 'center', paddingVertical: space.sm }]}>기존 결과 유지</Text>
          </Pressable>
        </Card>
      ) : null}

      {/* ── 탭 ── */}
      <View style={{ flexDirection: 'row', backgroundColor: colors.surfaceCardDark, borderRadius: radius.lg, padding: 4, marginBottom: space.md }}>
        {TABS.map((t) => (
          <Pressable key={t.key} onPress={() => setTab(t.key)}
            style={{ flex: 1, paddingVertical: 8, borderRadius: radius.md, alignItems: 'center',
              backgroundColor: tab === t.key ? colors.surfaceElevatedDark : 'transparent' }}>
            <Text style={[type.titleSm, { color: tab === t.key ? colors.primary : colors.muted }]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* ── AI 분석 탭 ── */}
      {tab === 'ai' ? (
        review ? (
          <Card>
            {(review.reason_reviews ?? []).map((r, i) => (
              <View key={i} style={{ marginBottom: space.md, paddingBottom: space.md, borderBottomWidth: 1, borderBottomColor: colors.hairlineOnDark }}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: space.xxs }}>
                  <Text style={[type.titleSm, { color: colors.onDark, flex: 1, marginRight: space.xs }]}>{r.reason}</Text>
                  <VerdictBadge verdict={r.verdict} />
                </View>
                <Text style={[type.bodyMd, { color: colors.body }]}>{r.comment}</Text>
              </View>
            ))}
            {!review.reason_reviews && review.soundness ? (
              <Text style={[type.bodyMd, { color: colors.body, marginBottom: space.md }]}>{review.soundness}</Text>
            ) : null}
            {(review.missing_points ?? []).length > 0 ? (
              <Section title="놓치고 있는 관점">
                {review.missing_points!.map((m, i) => (
                  <Text key={i} style={[type.bodyMd, { color: colors.statusWatch, marginBottom: space.xxs }]}>· {m}</Text>
                ))}
              </Section>
            ) : null}
            <Section title="가설이 깨질 수 있는 경우 — 채택하면 '깨지는 조건'에 추가">
              {review.counterpoints.map((c, i) => (
                <AdoptRow key={i} text={c} color={colors.tradingDown}
                  adopted={isAdopted('break_conditions', c)} onAdopt={() => adopt('break_conditions', c)} />
              ))}
            </Section>
            {(review.add_candidates ?? []).length > 0 ? (
              <Section title="추가매수 조건 후보 — 채택하면 '추가매수 조건'에 추가">
                {review.add_candidates!.map((a, i) => (
                  <AdoptRow key={i} text={a} color={colors.body}
                    adopted={isAdopted('add_conditions', a)} onAdopt={() => adopt('add_conditions', a)} />
                ))}
              </Section>
            ) : null}
            {revision ? (
              <View style={{ borderWidth: 1, borderColor: colors.primary, borderRadius: radius.lg, padding: space.md, marginBottom: space.md }}>
                <Text style={[type.titleSm, { color: colors.primary, marginBottom: space.sm }]}>피드백 반영 수정안 (아직 적용 안 됨)</Text>
                <Section title="매수 이유">
                  <NumberedText text={revision.buy_reason} />
                </Section>
                <Section title="깨지는 조건">
                  <NumberedText text={revision.break_conditions} />
                </Section>
                {revision.add_conditions ? (
                  <Section title="추가매수 조건">
                    <NumberedText text={revision.add_conditions} />
                  </Section>
                ) : null}
                {revision.note ? (
                  <Text style={[type.bodySm, { color: colors.statusWatch, marginBottom: space.md }]}>바뀐 점: {revision.note}</Text>
                ) : null}
                <PrimaryButton title={updateThesis.isPending ? '적용 중…' : '이 수정안 적용하기'} onPress={applyRevision} disabled={updateThesis.isPending} />
                <Pressable onPress={() => setRevision(null)} disabled={updateThesis.isPending}>
                  <Text style={[type.button, { color: colors.muted, textAlign: 'center', paddingVertical: space.sm }]}>무시</Text>
                </Pressable>
              </View>
            ) : (
              <Pressable onPress={askRevision} disabled={reviseThesis.isPending}>
                <Text style={[type.button, { color: colors.primary, textAlign: 'center', paddingVertical: space.xs }]}>
                  {reviseThesis.isPending ? '수정안 만드는 중…' : '피드백 반영 수정안 받기'}
                </Text>
              </Pressable>
            )}
            {!pendingResult ? (
              <Pressable onPress={startRecheck} disabled={preview.isPending}>
                <Text style={[type.button, { color: colors.mutedStrong, textAlign: 'center', paddingVertical: space.xs }]}>
                  {preview.isPending ? '다시 점검 중… (기존 결과는 그대로)' : '다시 점검하기'}
                </Text>
              </Pressable>
            ) : null}
          </Card>
        ) : verify.isPending ? (
          <Card style={{ alignItems: 'center', paddingVertical: space.xl }}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={[type.titleSm, { color: colors.onDark, marginTop: space.md }]}>AI가 가설을 점검하고 있어요</Text>
            <Text style={[type.bodySm, { color: colors.muted, marginTop: space.xxs, textAlign: 'center' }]}>
              웹에서 최신 자료를 찾는 중입니다{'\n'}30초~1분 30초 정도 걸려요. 나갔다 와도 돼요.
            </Text>
          </Card>
        ) : (
          <PrimaryButton title="AI 가설 점검 시작" onPress={() => verify.mutate(id!, { onError: (e) => Alert.alert('점검 실패', e.message) })} />
        )
      ) : null}

      {/* ── 감시 항목 탭 ── */}
      {tab === 'watch' ? (
        <Card>
          {(conditions ?? []).length === 0 ? (
            <Text style={[type.bodyMd, { color: colors.muted }]}>감시 중인 항목이 없어요. AI 점검을 실행하면 자동으로 추가돼요.</Text>
          ) : (
            <>
              {(conditions ?? []).map((c) => {
                const meta = STATE_META[c.condition_state] ?? STATE_META.ok;
                return (
                  <View key={c.id} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: colors.hairlineOnDark }}>
                    <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: meta.color + '26', alignItems: 'center', justifyContent: 'center', marginRight: space.sm }}>
                      <Text style={{ color: meta.color, fontSize: 12, fontWeight: '700' }}>{meta.icon}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[type.bodyMd, { color: c.condition_state === 'broken' ? colors.tradingDown : colors.body }]} numberOfLines={2}>{c.label}</Text>
                      {c.next_check_date ? (
                        <Text style={[type.numberSm, { color: colors.muted, marginTop: 1 }]}>{c.next_check_date.replaceAll('-', '.')}</Text>
                      ) : null}
                    </View>
                    {c.source === 'user' ? <Text style={[type.caption, { color: colors.muted, marginLeft: space.xs }]}>내 선택</Text> : null}
                    <Text style={[type.caption, { color: meta.color, marginLeft: space.xs }]}>{meta.label}</Text>
                  </View>
                );
              })}
              <Text style={[type.caption, { color: colors.muted, marginTop: space.sm }]}>매일 점검 때 깨짐 여부를 자동으로 추적해요</Text>
            </>
          )}
        </Card>
      ) : null}

      {/* ── 내 가설 탭 ── */}
      {tab === 'mine' ? (
        <>
          <Card style={{ marginBottom: space.md }}>
            {editing ? (
              <>
                <TextField dark label="매수 이유 (가설)" value={eBuy} onChangeText={setEBuy} multiline />
                <TextField dark label="가설이 깨지는 조건" value={eBreak} onChangeText={setEBreak} multiline />
                <TextField dark label="추가매수 조건 (선택)" value={eAdd} onChangeText={setEAdd} multiline />
                <TextField dark label="목표 보유 기간" value={eHorizon} onChangeText={setEHorizon} />
                <PrimaryButton title={updateThesis.isPending ? '저장 중…' : '저장'} onPress={saveEdit} disabled={updateThesis.isPending} />
                <Pressable onPress={() => setEditing(false)} disabled={updateThesis.isPending}>
                  <Text style={[type.button, { color: colors.muted, textAlign: 'center', paddingVertical: space.sm }]}>취소</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Section title="매수 이유">
                  <NumberedText text={thesis.buy_reason} />
                </Section>
                <Section title="깨지는 조건">
                  <NumberedText text={thesis.break_conditions} />
                </Section>
                {thesis.add_conditions ? (
                  <Section title="추가매수 조건">
                    <NumberedText text={thesis.add_conditions} />
                  </Section>
                ) : null}
                <Section title="목표 보유 기간">
                  <Text style={[type.bodyMd, { color: colors.body }]}>{thesis.target_horizon}</Text>
                </Section>
                {thesis.status !== 'closed' ? (
                  <Pressable onPress={startEdit}>
                    <Text style={[type.button, { color: colors.primary, textAlign: 'center', paddingVertical: space.xs }]}>가설 수정하기</Text>
                  </Pressable>
                ) : null}
              </>
            )}
          </Card>
          {thesis.status !== 'closed' ? (
            <Pressable onPress={confirmClose} disabled={close.isPending}
              style={{ alignItems: 'center', paddingVertical: space.sm, borderRadius: radius.md, borderWidth: 1, borderColor: colors.hairlineOnDark }}>
              <Text style={[type.button, { color: colors.mutedStrong }]}>{close.isPending ? '기록 중…' : '가설 종료 (성공/실패 기록)'}</Text>
            </Pressable>
          ) : (
            <Text style={[type.titleSm, { color: thesis.outcome === 'success' ? colors.tradingUp : colors.tradingDown, textAlign: 'center' }]}>
              {thesis.outcome === 'success' ? '성공으로 종료된 가설' : '실패로 종료된 가설'} · 히스토리에서 복기
            </Text>
          )}
        </>
      ) : null}

      <Text style={[type.bodySm, { color: colors.muted, marginTop: space.lg }]}>{DISCLAIMER}</Text>
    </ScrollView>
  );
}
