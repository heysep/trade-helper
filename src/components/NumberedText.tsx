import { Text, View } from 'react-native';
import { colors, type, space } from '@/theme';

/** 줄 단위 항목 분해: 이미 "1." 등 번호가 있으면 벗겨서 내용만 */
export function splitItems(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim().replace(/^\d+[.)]\s*/, ''))
    .filter((l) => l.length > 0);
}

/** 멀티라인 가설 텍스트를 번호 목록으로 렌더 (한 줄이면 번호 없이) */
export function NumberedText({ text, color = colors.body }: { text: string; color?: string }) {
  const items = splitItems(text);
  if (items.length <= 1) {
    return <Text style={[type.bodyMd, { color }]}>{items[0] ?? ''}</Text>;
  }
  return (
    <View>
      {items.map((item, i) => (
        <View key={i} style={{ flexDirection: 'row', marginBottom: space.xxs }}>
          <Text style={[type.numberSm, { color: colors.muted, width: 22, lineHeight: 21 }]}>{i + 1}.</Text>
          <Text style={[type.bodyMd, { color, flex: 1 }]}>{item}</Text>
        </View>
      ))}
    </View>
  );
}
