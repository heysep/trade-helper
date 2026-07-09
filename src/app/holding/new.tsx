import { useState } from 'react';
import { ScrollView, View, Text, Alert, Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAddHolding } from '@/hooks/useHoldings';
import { useAddThesis } from '@/hooks/useTheses';
import { tickerExists } from '@/lib/ticker';
import { validateThesisInput } from '../thesis/new';
import { TextField } from '@/components/TextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { DISCLAIMER } from '@/constants/brand';
import { colors, type, space, radius } from '@/theme';

export default function NewHoldingScreen() {
  const router = useRouter();
  const addHolding = useAddHolding();
  const addThesis = useAddThesis();
  const [name, setName] = useState('');
  const [ticker, setTicker] = useState('');
  const [market, setMarket] = useState<'KRX' | 'US'>('US');
  const [buyReason, setBuyReason] = useState('');
  const [breakConditions, setBreakConditions] = useState('');
  const [addConditions, setAddConditions] = useState('');
  const [horizon, setHorizon] = useState('');

  const pending = addHolding.isPending || addThesis.isPending;

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
        add_conditions: addConditions.trim() || null, target_horizon: horizon.trim(),
      });
      router.replace(`/thesis/${thesis.id}`);
    } catch (e) {
      Alert.alert('등록 실패', e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.canvasLight }} contentContainerStyle={{ padding: space.md, paddingBottom: space.xxl }}>
      <Stack.Screen options={{ title: '종목 + 가설 등록', headerStyle: { backgroundColor: colors.canvasLight }, headerTintColor: colors.ink, contentStyle: { backgroundColor: colors.canvasLight } }} />

      <Text style={[type.titleSm, { color: colors.ink, marginBottom: space.sm }]}>종목</Text>
      <TextField label="종목명" value={name} onChangeText={setName} placeholder="엔비디아" />
      <TextField label="티커" value={ticker} onChangeText={setTicker} placeholder="NVDA 또는 005930" />
      <Text style={[type.caption, { color: colors.muted, marginBottom: space.xxs }]}>시장</Text>
      <View style={{ flexDirection: 'row', gap: space.xs, marginBottom: space.lg }}>
        {(['US', 'KRX'] as const).map((m) => (
          <Pressable key={m} onPress={() => setMarket(m)}
            style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: radius.md, borderWidth: 1,
              borderColor: market === m ? colors.primary : colors.hairlineOnLight,
              backgroundColor: market === m ? colors.primary + '1F' : colors.canvasLight }}>
            <Text style={[type.titleSm, { color: market === m ? colors.ink : colors.muted }]}>{m === 'US' ? '해외(미국)' : '국내(KRX)'}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={[type.titleSm, { color: colors.ink, marginBottom: space.sm }]}>매수 가설</Text>
      <TextField label="매수 이유 (가설)" value={buyReason} onChangeText={setBuyReason} multiline
        placeholder="예: AI 인프라 투자가 계속 증가하고 데이터센터 매출 성장률이 유지된다면 장기 보유" />
      <TextField label="가설이 깨지는 조건" value={breakConditions} onChangeText={setBreakConditions} multiline
        placeholder="예: 빅테크 CAPEX 가이던스 하향, 데이터센터 성장률 둔화" />
      <TextField label="추가매수 조건 (선택)" value={addConditions} onChangeText={setAddConditions} multiline
        placeholder="예: 실적 유지 + 주가 20% 조정 시" />
      <TextField label="목표 보유 기간" value={horizon} onChangeText={setHorizon} placeholder="예: 2년" />

      <PrimaryButton title={pending ? '등록 중…' : '종목 + 가설 등록'} onPress={submit} disabled={pending} />
      <Text style={[type.bodySm, { color: colors.muted, marginTop: space.lg }]}>{DISCLAIMER}</Text>
    </ScrollView>
  );
}
