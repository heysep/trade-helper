import { Pressable, Text, View } from 'react-native';
import { colors, type, space, radius } from '@/theme';
import type { CalendarItem } from '@/hooks/useCheckConditions';
import type { MarketEvent } from '@/hooks/useMarketEvents';

export interface UnifiedItem {
  id: string;
  date: string;              // YYYY-MM-DD
  label: string;
  kind: 'mine' | 'market';
  starred: boolean;          // 내 일정: earnings / 시장 일정: importance high
  ticker?: string;           // kind=mine
  thesisId?: string;         // kind=mine
  region?: string;           // kind=market
}

export function mergeCalendar(mine: CalendarItem[], market: MarketEvent[]): UnifiedItem[] {
  const a: UnifiedItem[] = mine
    .filter((c) => c.next_check_date)
    .map((c) => ({
      id: `m-${c.id}`, date: c.next_check_date!, label: c.label, kind: 'mine',
      starred: c.event_type === 'earnings', ticker: c.theses.holdings.ticker, thesisId: c.theses.id,
    }));
  const b: UnifiedItem[] = market.map((e) => ({
    id: `e-${e.id}`, date: e.event_date, label: e.label, kind: 'market',
    starred: e.importance === 'high', region: e.region,
  }));
  return [...a, ...b].sort((x, y) => x.date.localeCompare(y.date));
}

export function groupByMonth(items: UnifiedItem[]): Array<{ month: string; items: UnifiedItem[] }> {
  const map = new Map<string, UnifiedItem[]>();
  for (const it of items) {
    const m = it.date.slice(0, 7);
    if (!map.has(m)) map.set(m, []);
    map.get(m)!.push(it);
  }
  return [...map.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([month, its]) => ({ month, items: its }));
}

export function formatMonth(m: string): string {
  return `${parseInt(m.slice(5), 10)}월`;
}

const DOW = ['일', '월', '화', '수', '목', '금', '토'];
const REGION_LABEL: Record<string, string> = { US: '미국', CN: '중국', KR: '한국', EU: '유럽', JP: '일본', global: '글로벌' };

export function CalendarRow({ item, onPress }: { item: UnifiedItem; onPress?: () => void }) {
  const d = new Date(item.date + 'T00:00:00');
  const market = item.kind === 'market';
  return (
    <Pressable onPress={onPress} disabled={!onPress}
      style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: space.sm, borderBottomWidth: 1, borderBottomColor: colors.hairlineOnDark }}>
      <Text style={[type.numberSm, { color: colors.mutedStrong, width: 64 }]}>
        {String(d.getDate()).padStart(2, '0')} ({DOW[d.getDay()]})
      </Text>
      <Text style={[type.titleSm, { color: market ? colors.mutedStrong : colors.onDark, flex: 1 }]} numberOfLines={1}>{item.label}</Text>
      {market ? (
        <View style={{ backgroundColor: colors.info + '26', borderRadius: radius.sm, paddingHorizontal: 6, paddingVertical: 2, marginRight: space.xs }}>
          <Text style={[type.caption, { color: colors.info }]}>{REGION_LABEL[item.region ?? 'global']}</Text>
        </View>
      ) : (
        <Text style={[type.caption, { color: colors.muted, marginRight: space.xs }]}>{item.ticker}</Text>
      )}
      {item.starred ? <Text style={{ color: colors.primary }}>★</Text> : null}
    </Pressable>
  );
}
