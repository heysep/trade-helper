import { useState } from 'react';
import { ScrollView, View, Text, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAddHolding } from '@/hooks/useHoldings';
import { useAddThesis } from '@/hooks/useTheses';
import { useAddUserConditions } from '@/hooks/useCheckConditions';
import { useSuggest, SuggestResult } from '@/hooks/useSuggest';
import { useDialog } from '@/components/Dialog';
import { tickerExists } from '@/lib/ticker';
import { validateThesisInput } from '../thesis/new';
import { TextField } from '@/components/TextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { DISCLAIMER } from '@/constants/brand';
import { colors, type, space, radius } from '@/theme';

/** 텍스트필드에 후보 문장 토글 (줄 단위 추가/제거) — 직접 쓴 내용은 건드리지 않음 */
export function toggleLine(current: string, line: string): string {
  const lines = current.split('\n').filter((l) => l.trim());
  const idx = lines.indexOf(line);
  if (idx >= 0) lines.splice(idx, 1);
  else lines.push(line);
  return lines.join('\n');
}

function Chip({ label, selected, onPress, small }: { label: string; selected: boolean; onPress: () => void; small?: boolean }) {
  return (
    <Pressable onPress={onPress}
      style={{ borderRadius: radius.lg, borderWidth: 1, paddingHorizontal: small ? 10 : 12, paddingVertical: small ? 6 : 9,
        marginBottom: space.xs, marginRight: space.xs,
        borderColor: selected ? colors.primary : colors.hairlineOnLight,
        backgroundColor: selected ? colors.primary + '1F' : colors.canvasLight }}>
      <Text style={[small ? type.caption : type.bodySm, { color: selected ? colors.ink : colors.muted }]}>
        {selected ? '✓ ' : '+ '}{label}
      </Text>
    </Pressable>
  );
}

function StepHeader({ step, titles }: { step: number; titles: string[] }) {
  return (
    <View style={{ marginBottom: space.lg }}>
      <View style={{ flexDirection: 'row', gap: 6, marginBottom: space.sm }}>
        {titles.map((_, i) => (
          <View key={i} style={{ flex: 1, height: 4, borderRadius: 2, backgroundColor: i < step ? colors.primary : colors.hairlineOnLight }} />
        ))}
      </View>
      <Text style={[type.displaySm, { color: colors.ink }]}>{titles[step - 1]}</Text>
      <Text style={[type.caption, { color: colors.muted, marginTop: 2 }]}>{step} / {titles.length}</Text>
    </View>
  );
}

const TITLES = ['어떤 종목인가요?', '왜 사나요?', '조건과 감시 항목'];

export default function NewHoldingScreen() {
  const router = useRouter();
  const addHolding = useAddHolding();
  const addThesis = useAddThesis();
  const addConditions = useAddUserConditions();
  const suggest = useSuggest();
  const dialog = useDialog();
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [ticker, setTicker] = useState('');
  const [market, setMarket] = useState<'KRX' | 'US'>('US');
  const [buyReason, setBuyReason] = useState('');
  const [breakConditions, setBreakConditions] = useState('');
  const [addCond, setAddCond] = useState('');
  const [horizon, setHorizon] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestResult | null>(null);
  const [watchPicked, setWatchPicked] = useState<string[]>([]);
  const [checkingTicker, setCheckingTicker] = useState(false);

  const pending = addHolding.isPending || addThesis.isPending;

  // Step 1 → 2: 티커 검증 + AI 추천 백그라운드 시작
  const goStep2 = async () => {
    if (!name.trim() || !ticker.trim()) { dialog.show({ title: '입력 확인', message: '종목명과 티커를 입력해 주세요.' }); return; }
    setCheckingTicker(true);
    const exists = await tickerExists(ticker.trim(), market);
    setCheckingTicker(false);
    if (exists === false) {
      dialog.show({ title: '티커 확인 필요', message: `${market} 시장에서 "${ticker.trim().toUpperCase()}" 시세를 찾을 수 없습니다.` });
      return;
    }
    if (!suggestions && !suggest.isPending) {
      suggest.mutate({ name: name.trim(), ticker: ticker.trim(), market }, { onSuccess: setSuggestions });
    }
    setStep(2);
  };

  const goStep3 = () => {
    if (!buyReason.trim()) { dialog.show({ title: '입력 확인', message: '매수 이유를 입력하거나 AI 후보에서 골라주세요.' }); return; }
    setStep(3);
  };

  const toggleWatch = (w: string) =>
    setWatchPicked((prev) => prev.includes(w) ? prev.filter((x) => x !== w) : [...prev, w]);

  const submit = async () => {
    const err = validateThesisInput({ buy_reason: buyReason, break_conditions: breakConditions, target_horizon: horizon });
    if (err) { dialog.show({ title: '입력 확인', message: err }); return; }
    try {
      const holding = await addHolding.mutateAsync({ name: name.trim(), ticker: ticker.trim(), market });
      const thesis = await addThesis.mutateAsync({
        holding_id: holding.id, buy_reason: buyReason.trim(), break_conditions: breakConditions.trim(),
        add_conditions: addCond.trim() || null, target_horizon: horizon.trim(),
      });
      if (watchPicked.length) {
        await addConditions.mutateAsync({ thesisId: thesis.id, labels: watchPicked });
      }
      router.replace(`/thesis/${thesis.id}`);
    } catch (e) {
      dialog.show({ title: '등록 실패', message: e instanceof Error ? e.message : String(e) });
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={88}>
    <ScrollView style={{ flex: 1, backgroundColor: colors.canvasLight }} contentContainerStyle={{ padding: space.md, paddingBottom: space.xxl }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: '가설 등록', headerStyle: { backgroundColor: colors.canvasLight }, headerTintColor: colors.ink, contentStyle: { backgroundColor: colors.canvasLight } }} />
      <StepHeader step={step} titles={TITLES} />

      {step === 1 ? (
        <>
          <TextField label="종목명" value={name} onChangeText={setName} placeholder="엔비디아" />
          <TextField label="티커" value={ticker} onChangeText={setTicker} placeholder="NVDA 또는 005930" autoCapitalize="characters" />
          <Text style={[type.caption, { color: colors.muted, marginBottom: space.xxs }]}>시장</Text>
          <View style={{ flexDirection: 'row', gap: space.xs, marginBottom: space.xl }}>
            {(['US', 'KRX'] as const).map((m) => (
              <Pressable key={m} onPress={() => setMarket(m)}
                style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1,
                  borderColor: market === m ? colors.primary : colors.hairlineOnLight,
                  backgroundColor: market === m ? colors.primary + '1F' : colors.canvasLight }}>
                <Text style={[type.titleSm, { color: market === m ? colors.ink : colors.muted }]}>{m === 'US' ? '해외(미국)' : '국내(KRX)'}</Text>
              </Pressable>
            ))}
          </View>
          <PrimaryButton title={checkingTicker ? '티커 확인 중…' : '다음'} onPress={goStep2} disabled={checkingTicker} />
        </>
      ) : null}

      {step === 2 ? (
        <>
          <Text style={[type.titleSm, { color: colors.ink, marginBottom: space.xs }]}>🤖 AI 추천 논거 <Text style={[type.caption, { color: colors.muted }]}>— 탭해서 담기 (선택)</Text></Text>
          {suggest.isPending ? (
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: space.md }}>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text style={[type.bodySm, { color: colors.muted }]}>이 종목의 논거를 찾는 중… 먼저 직접 써도 돼요</Text>
            </View>
          ) : suggestions ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: space.sm }}>
              {suggestions.reasons.map((r, i) => (
                <Chip key={i} label={r.text}
                  selected={buyReason.split('\n').includes(r.text)}
                  onPress={() => setBuyReason((cur) => toggleLine(cur, r.text))} />
              ))}
            </View>
          ) : (
            <Pressable onPress={() => suggest.mutate({ name: name.trim(), ticker: ticker.trim(), market }, { onSuccess: setSuggestions, onError: (e) => dialog.show({ title: '추천 실패', message: e.message }) })}>
              <Text style={[type.bodySm, { color: colors.primary, marginBottom: space.sm }]}>추천 다시 불러오기</Text>
            </Pressable>
          )}

          <Text style={[type.titleSm, { color: colors.ink, marginBottom: space.xs, marginTop: space.sm }]}>✍️ 내 논거</Text>
          <TextField label="매수 이유 (가설)" value={buyReason} onChangeText={setBuyReason} multiline
            placeholder="예: AI 인프라 투자가 계속 증가하고 데이터센터 매출 성장률이 유지된다면 장기 보유" />
          <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.md }}>
            <View style={{ flex: 1 }}>
              <Pressable onPress={() => setStep(1)} style={{ borderRadius: radius.md, borderWidth: 1, borderColor: colors.hairlineOnLight, paddingVertical: 13, alignItems: 'center' }}>
                <Text style={[type.button, { color: colors.muted }]}>이전</Text>
              </Pressable>
            </View>
            <View style={{ flex: 2 }}>
              <PrimaryButton title="다음" onPress={goStep3} />
            </View>
          </View>
        </>
      ) : null}

      {step === 3 ? (
        <>
          {suggestions?.break_candidates.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: space.xs }}>
              {suggestions.break_candidates.map((b, i) => (
                <Chip key={i} label={b}
                  selected={breakConditions.split('\n').includes(b)}
                  onPress={() => setBreakConditions((cur) => toggleLine(cur, b))} />
              ))}
            </View>
          ) : null}
          <TextField label="가설이 깨지는 조건" value={breakConditions} onChangeText={setBreakConditions} multiline
            placeholder="예: 빅테크 CAPEX 가이던스 하향" />

          {suggestions?.add_candidates.length ? (
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: space.xs }}>
              {suggestions.add_candidates.map((a, i) => (
                <Chip key={i} label={a}
                  selected={addCond.split('\n').includes(a)}
                  onPress={() => setAddCond((cur) => toggleLine(cur, a))} />
              ))}
            </View>
          ) : null}
          <TextField label="추가매수 조건 (선택)" value={addCond} onChangeText={setAddCond} multiline
            placeholder="예: 실적 유지 + 주가 20% 조정 시" />
          <TextField label="목표 보유 기간" value={horizon} onChangeText={setHorizon} placeholder="예: 2년" />

          {suggestions ? (
            <View style={{ marginBottom: space.lg }}>
              <Text style={[type.caption, { color: colors.muted, marginBottom: space.xs }]}>감시할 항목 — 선택하면 매일 점검 때 깨졌는지 추적해요</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
                {[...new Set(suggestions.reasons.flatMap((r) => r.watch_items))].map((w, i) => (
                  <Chip key={i} label={w} small selected={watchPicked.includes(w)} onPress={() => toggleWatch(w)} />
                ))}
              </View>
            </View>
          ) : null}

          <View style={{ flexDirection: 'row', gap: space.sm }}>
            <View style={{ flex: 1 }}>
              <Pressable onPress={() => setStep(2)} style={{ borderRadius: radius.md, borderWidth: 1, borderColor: colors.hairlineOnLight, paddingVertical: 13, alignItems: 'center' }}>
                <Text style={[type.button, { color: colors.muted }]}>이전</Text>
              </Pressable>
            </View>
            <View style={{ flex: 2 }}>
              <PrimaryButton title={pending ? '등록 중…' : '등록하기'} onPress={submit} disabled={pending} />
            </View>
          </View>
          <Text style={[type.bodySm, { color: colors.muted, marginTop: space.lg }]}>{DISCLAIMER}</Text>
        </>
      ) : null}
    </ScrollView>
    </KeyboardAvoidingView>
  );
}
