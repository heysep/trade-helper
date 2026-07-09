import { useState } from 'react';
import { View, Text, Alert, Pressable } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { useAddHolding } from '@/hooks/useHoldings';
import { TextField } from '@/components/TextField';
import { PrimaryButton } from '@/components/PrimaryButton';
import { colors, type, space, radius } from '@/theme';

export default function NewHoldingScreen() {
  const router = useRouter();
  const add = useAddHolding();
  const [name, setName] = useState('');
  const [ticker, setTicker] = useState('');
  const [market, setMarket] = useState<'KRX' | 'US'>('US');

  const submit = () => {
    if (!name.trim() || !ticker.trim()) { Alert.alert('입력 확인', '종목명과 티커를 입력해 주세요.'); return; }
    add.mutate({ name: name.trim(), ticker: ticker.trim(), market }, {
      onSuccess: () => router.back(),
      onError: (e) => Alert.alert('등록 실패', e.message),
    });
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.canvasLight, padding: space.md }}>
      <Stack.Screen options={{ title: '종목 추가', headerStyle: { backgroundColor: colors.canvasLight }, headerTintColor: colors.ink, contentStyle: { backgroundColor: colors.canvasLight } }} />
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
      <PrimaryButton title={add.isPending ? '등록 중…' : '등록'} onPress={submit} disabled={add.isPending} />
    </View>
  );
}
