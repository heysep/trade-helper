import { Text, View } from 'react-native';
import { colors, type, space } from '@/theme';

/** 줄 단위 항목 분해: 이미 "1." 등 번호가 있으면 벗겨서 내용만 */
export function splitItems(text: string): string[] {
  return text
    .split('\n')
    .map((l) => l.trim().replace(/^\d+[.)]\s*/, ''))
    .filter((l) => l.length > 0);
}

/** 편집용: 번호 붙인 형태로 변환 (여러 줄일 때만) */
export function toNumbered(text: string): string {
  const items = splitItems(text);
  if (items.length <= 1) return items[0] ?? '';
  return items.map((l, i) => `${i + 1}. ${l}`).join('\n');
}

/** 편집용: 저장 전 번호 제거 */
export function fromNumbered(text: string): string {
  return splitItems(text).join('\n');
}

/** 편집 중 엔터 입력 시 다음 번호 자동 삽입 (첫 줄에 번호 없으면 같이 붙임) */
export function autoNumberOnEnter(prev: string, next: string): string {
  if (next.length > prev.length && next.endsWith('\n')) {
    const items = splitItems(next);
    if (items.length === 0) return next;
    // 첫 엔터인데 기존 줄에 번호가 없으면 전체를 번호 형식으로 전환
    const hasNumbering = /^\s*\d+[.)]/.test(next);
    if (!hasNumbering) {
      return `${items.map((l, i) => `${i + 1}. ${l}`).join('\n')}\n${items.length + 1}. `;
    }
    return `${next}${items.length + 1}. `;
  }
  return next;
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
