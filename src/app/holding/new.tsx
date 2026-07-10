import { useState } from 'react';
import { ScrollView, View, Text, Alert, Pressable, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAddHolding } from '@/hooks/useHoldings';
import { useAddThesis } from '@/hooks/useTheses';
import { useAddUserConditions } from '@/hooks/useCheckConditions';
import { useSuggest, SuggestResult } from '@/hooks/useSuggest';
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

export default function NewHoldingScreen() {
  const router = useRouter();
  const addHolding = useAddHolding();
  const addThesis = useAddThesis();
  const addConditions = useAddUserConditions();
  const suggest = useSuggest();
  const [name, setName] = useState('');
  const [ticker, setTicker] = useState('');
  const [market, setMarket] = useState<'KRX' | 'US'>('US');
  const [buyReason, setBuyReason] = useState('');
  const [breakConditions, setBreakConditions] = useState('');
  const [addCond, setAddCond] = useState('');
  const [horizon, setHorizon] = useState('');
  const [suggestions, setSuggestions] = useState<SuggestResult | null>(null);
  const [watchPicked, setWatchPicked] = useState<string[]>([]);

  const pending = addHolding.isPending || addThesis.isPending;

  const askSuggest = () => {
    if (!name.trim() || !ticker.trim()) { Alert.alert('입력 확인', '종목명과 티커를 먼저 입력해 주세요.'); return; }
    suggest.mutate({ name: name.trim(), ticker: ticker.trim(), market }, {
      onSuccess: setSuggestions,
      onError: (e) => Alert.alert('추천 실패', e.message),
    });
  };

  const toggleWatch = (w: string) =>
    setWatchPicked((prev) => prev.includes(w) ? prev.filter((x) => x !== w) : [...prev, w]);

  const submit = async () => {
    if (!name.trim() || !ticker.trim()) { Alert.alert('입력 확인', '종목명과 티커를 입력해 주세요.'); return; }
    const err = validateThesisInput({ buy_reason: buyReason, break_conditions: breakConditions, target_horizon: horizon });
    if (err) { Alert.alert('입력 확인', err); return; }
    const exists = await tickerExists(ticker.trim(), market);
    if (exists === false) {
      Alert.alert('티커 확인 필요', `${market} 시장에서 "${ticker.trim().toUpperCase()}" 시세를 찾을 수 없습니다. 티커를 다시 확인해 주세요.`);
      return;
    }
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
      Alert.alert('등록 실패', e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={88}>
    <ScrollView style={{ flex: 1, backgroundColor: colors.canvasLight }} contentContainerStyle={{ padding: space.md, paddingBottom: space.xxl }} keyboardShouldPersistTaps="handled">
      <Stack.Screen options={{ title: '종목 + 가설 등록', headerStyle: { backgroundColor: colors.canvasLight }, headerTintColor: colors.ink, contentStyle: { backgroundColor: colors.canvasLight } }} />

      <Text style={[type.titleSm, { color: colors.ink, marginBottom: space.sm }]}>종목</Text>
      <TextField label="종목명" value={name} onChangeText={setName} placeholder="엔비디아" />
      <TextField label="티커" value={ticker} onChangeText={setTicker} placeholder="NVDA 또는 005930" autoCapitalize="characters" />
      <Text style={[type.caption, { color: colors.muted, marginBottom: space.xxs }]}>시장</Text>
      <View style={{ flexDirection: 'row', gap: space.xs, marginBottom: space.md }}>
        {(['US', 'KRX'] as const).map((m) => (
          <Pressable key={m} onPress={() => setMarket(m)}
            style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1,
              borderColor: market === m ? colors.primary : colors.hairlineOnLight,
              backgroundColor: market === m ? colors.primary + '1F' : colors.canvasLight }}>
            <Text style={[type.titleSm, { color: market === m ? colors.ink : colors.muted }]}>{m === 'US' ? '해외(미국)' : '국내(KRX)'}</Text>
          </Pressable>
        ))}
      </View>

      {!suggestions ? (
        <Pressable onPress={askSuggest} disabled={suggest.isPending}
          style={{ borderRadius: radius.md, borderWidth: 1, borderColor: colors.primary, paddingVertical: space.sm, alignItems: 'center', marginBottom: space.lg, flexDirection: 'row', justifyContent: 'center', gap: 8 }}>
          {suggest.isPending ? <ActivityIndicator color={colors.primary} size="small" /> : null}
          <Text style={[type.button, { color: suggest.isPending ? colors.muted : colors.ink }]}>
            {suggest.isPending ? 'AI가 논거를 찾는 중… (30초 정도)' : '🤖 AI에게 매수 논거 추천받기 (선택)'}
          </Text>
        </Pressable>
      ) : null}

      <Text style={[type.titleSm, { color: colors.ink, marginBottom: space.sm }]}>매수 가설</Text>

      {suggestions ? (
        <View style={{ marginBottom: space.sm }}>
          <Text style={[type.caption, { color: colors.muted, marginBottom: space.xs }]}>AI 추천 논거 — 탭해서 담기 (직접 쓴 내용은 그대로 유지돼요)</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {suggestions.reasons.map((r, i) => (
              <Chip key={i} label={r.text}
                selected={buyReason.split('\n').includes(r.text)}
                onPress={() => setBuyReason((cur) => toggleLine(cur, r.text))} />
            ))}
          </View>
        </View>
      ) : null}
      <TextField label="매수 이유 (가설)" value={buyReason} onChangeText={setBuyReason} multiline
        placeholder="예: AI 인프라 투자가 계속 증가하고 데이터센터 매출 성장률이 유지된다면 장기 보유" />

      {suggestions ? (
        <View style={{ marginBottom: space.sm }}>
          <Text style={[type.caption, { color: colors.muted, marginBottom: space.xs }]}>깨지는 조건 후보</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {suggestions.break_candidates.map((b, i) => (
              <Chip key={i} label={b}
                selected={breakConditions.split('\n').includes(b)}
                onPress={() => setBreakConditions((cur) => toggleLine(cur, b))} />
            ))}
          </View>
        </View>
      ) : null}
      <TextField label="가설이 깨지는 조건" value={breakConditions} onChangeText={setBreakConditions} multiline
        placeholder="예: 빅테크 CAPEX 가이던스 하향, 데이터센터 성장률 둔화" />

      {suggestions ? (
        <View style={{ marginBottom: space.sm }}>
          <Text style={[type.caption, { color: colors.muted, marginBottom: space.xs }]}>추가매수 조건 후보</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
            {suggestions.add_candidates.map((a, i) => (
              <Chip key={i} label={a}
                selected={addCond.split('\n').includes(a)}
                onPress={() => setAddCond((cur) => toggleLine(cur, a))} />
            ))}
          </View>
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

      <PrimaryButton title={pending ? '등록 중…' : '종목 + 가설 등록'} onPress={submit} disabled={pending} />
      <Text style={[type.bodySm, { color: colors.muted, marginTop: space.lg }]}>{DISCLAIMER}</Text>
    </ScrollView>
    </KeyboardAvoidingView>
  );
}
