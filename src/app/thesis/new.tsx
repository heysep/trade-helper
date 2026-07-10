import { useState } from 'react';
import { ScrollView, Text } from 'react-native';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useAddThesis } from '@/hooks/useTheses';
import { useDialog } from '@/components/Dialog';
import { TextField } from '@/components/TextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { DISCLAIMER } from '@/constants/brand';
import { colors, type, space } from '@/theme';

export function validateThesisInput(i: { buy_reason: string; break_conditions: string; target_horizon: string }): string | null {
  if (!i.buy_reason.trim()) return '매수 이유를 입력해 주세요.';
  if (!i.break_conditions.trim()) return '가설이 깨지는 조건을 입력해 주세요.';
  if (!i.target_horizon.trim()) return '목표 보유 기간을 입력해 주세요.';
  return null;
}

export default function NewThesisScreen() {
  const router = useRouter();
  const { holdingId } = useLocalSearchParams<{ holdingId: string }>();
  const add = useAddThesis();
  const dialog = useDialog();
  const [buyReason, setBuyReason] = useState('');
  const [breakConditions, setBreakConditions] = useState('');
  const [addConditions, setAddConditions] = useState('');
  const [horizon, setHorizon] = useState('');

  const submit = () => {
    const err = validateThesisInput({ buy_reason: buyReason, break_conditions: breakConditions, target_horizon: horizon });
    if (err) { dialog.show({ title: '입력 확인', message: err }); return; }
    add.mutate(
      { holding_id: holdingId!, buy_reason: buyReason.trim(), break_conditions: breakConditions.trim(),
        add_conditions: addConditions.trim() || null, target_horizon: horizon.trim() },
      { onSuccess: (t) => router.replace(`/thesis/${t.id}`), onError: (e) => dialog.show({ title: '저장 실패', message: e.message }) },
    );
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.canvasLight }} contentContainerStyle={{ padding: space.md }}>
      <Stack.Screen options={{ title: '매수 가설 등록', headerStyle: { backgroundColor: colors.canvasLight }, headerTintColor: colors.ink, contentStyle: { backgroundColor: colors.canvasLight } }} />
      <TextField label="매수 이유 (가설)" value={buyReason} onChangeText={setBuyReason} multiline
        placeholder="예: AI 인프라 투자가 계속 증가하고 데이터센터 매출 성장률이 유지된다면 장기 보유" />
      <TextField label="가설이 깨지는 조건" value={breakConditions} onChangeText={setBreakConditions} multiline
        placeholder="예: 빅테크 CAPEX 가이던스 하향, 데이터센터 성장률 둔화" />
      <TextField label="추가매수 조건 (선택)" value={addConditions} onChangeText={setAddConditions} multiline
        placeholder="예: 실적 유지 + 주가 20% 조정 시" />
      <TextField label="목표 보유 기간" value={horizon} onChangeText={setHorizon} placeholder="예: 2년" />
      <PrimaryButton title={add.isPending ? '저장 중…' : '가설 저장'} onPress={submit} disabled={add.isPending} />
      <Text style={[type.bodySm, { color: colors.muted, marginTop: space.lg }]}>{DISCLAIMER}</Text>
    </ScrollView>
  );
}
