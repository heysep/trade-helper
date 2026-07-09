import { Pressable, Text, View } from 'react-native';
import { colors, type, space } from '@/theme';
import type { CalendarItem } from '@/hooks/useCheckConditions';

export function groupByMonth(items: CalendarItem[]): Array<{ month: string; items: CalendarItem[] }> {
  const map = new Map<string, CalendarItem[]>();
  for (const it of items) {
    if (!it.next_check_date) continue;
    const m = it.next_check_date.slice(0, 7);
    if (!map.has(m)) map.set(m, []);
    map.get(m)!.push(it);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, its]) => ({ month, items: its }));
}

export function formatMonth(m: string): string {
  return `${parseInt(m.slice(5), 10)}월`;
}

const DOW = ['일', '월', '화', '수', '목', '금', '토'];

export function CalendarRow({ item, onPress }: { item: CalendarItem; onPress: () => void }) {
  const d = new Date(item.next_check_date + 'T00:00:00');
  return (
    <Pressable onPress={onPress} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: colors.hairlineOnDark }}>
      <Text style={[type.numberSm, { color: colors.mutedStrong, width: 64 }]}>
        {String(d.getDate()).padStart(2, '0')} ({DOW[d.getDay()]})
      </Text>
      <Text style={[type.titleSm, { color: colors.onDark, flex: 1 }]} numberOfLines={1}>{item.label}</Text>
      <Text style={[type.caption, { color: colors.muted, marginRight: space.xs }]}>{item.theses.holdings.ticker}</Text>
      {item.event_type === 'earnings' ? <Text style={{ color: colors.primary }}>★</Text> : null}
    </Pressable>
  );
}
