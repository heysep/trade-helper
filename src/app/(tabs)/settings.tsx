import { Linking, ScrollView, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import Constants from 'expo-constants';
import { Ionicons } from '@expo/vector-icons';
import { Card } from '@/components/Card';
import { BRAND, DISCLAIMER } from '@/constants/brand';
import { colors, type, space } from '@/theme';

function Row({ icon, label, sub, onPress }: {
  icon: keyof typeof Ionicons.glyphMap; label: string; sub?: string; onPress?: () => void;
}) {
  return (
    <Pressable onPress={onPress} disabled={!onPress}
      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: space.md, borderBottomWidth: 1, borderBottomColor: colors.hairlineOnDark }}>
      <Ionicons name={icon} size={20} color={colors.mutedStrong} style={{ marginRight: space.md }} />
      <View style={{ flex: 1 }}>
        <Text style={[type.titleSm, { color: colors.onDark }]}>{label}</Text>
        {sub ? <Text style={[type.bodySm, { color: colors.muted, marginTop: 2 }]}>{sub}</Text> : null}
      </View>
      {onPress ? <Ionicons name="chevron-forward" size={16} color={colors.muted} /> : null}
    </Pressable>
  );
}

export default function SettingsScreen() {
  const router = useRouter();
  const version = Constants.expoConfig?.version ?? '1.0.0';

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.canvasDark }} contentContainerStyle={{ padding: space.md, paddingBottom: space.xxl }}>
      <Card>
        <Row icon="stats-chart-outline" label="가설 히스토리" sub="성공/실패 복기와 통계" onPress={() => router.push('/history')} />
        <Row icon="notifications-outline" label="알림" sub="가설에 변화가 있을 때 하루 1번 알려드려요 (기기 설정에서 허용 필요)" />
        <Row icon="mail-outline" label="문의하기" sub="버그 제보·기능 제안" onPress={() => Linking.openURL('mailto:hiservice1@hiservice.cafe24.com?subject=WhyBuy%20문의')} />
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: space.md }}>
          <Ionicons name="information-circle-outline" size={20} color={colors.mutedStrong} style={{ marginRight: space.md }} />
          <View style={{ flex: 1 }}>
            <Text style={[type.titleSm, { color: colors.onDark }]}>{BRAND.appName} ({BRAND.appNameKo})</Text>
            <Text style={[type.bodySm, { color: colors.muted, marginTop: 2 }]}>버전 {version}</Text>
          </View>
        </View>
      </Card>

      <Card style={{ marginTop: space.md }}>
        <Text style={[type.titleSm, { color: colors.mutedStrong, marginBottom: space.xs }]}>이용 안내</Text>
        <Text style={[type.bodySm, { color: colors.muted, lineHeight: 20 }]}>{DISCLAIMER}</Text>
        <Text style={[type.bodySm, { color: colors.muted, marginTop: space.sm, lineHeight: 20 }]}>
          시세·차트는 표시용이며 지연될 수 있습니다. AI 점검 결과는 웹 검색 기반 요약으로 사실과 다를 수 있으니 중요한 결정 전에 원문을 확인하세요.
        </Text>
      </Card>
    </ScrollView>
  );
}
