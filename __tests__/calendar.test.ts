import { groupByMonth, formatMonth, mergeCalendar } from '../src/components/CalendarRow';
import type { CalendarItem } from '../src/hooks/useCheckConditions';
import type { MarketEvent } from '../src/hooks/useMarketEvents';

const mine = (date: string, label: string, eventType = 'metric'): CalendarItem => ({
  id: label, thesis_id: 't', label, event_type: eventType as CalendarItem['event_type'],
  next_check_date: date, status: 'open',
  theses: { id: 't', holdings: { ticker: 'NVDA' } },
});

const market = (date: string, label: string, importance: 'high' | 'normal' = 'high'): MarketEvent => ({
  id: label, event_date: date, label, region: 'CN', importance,
});

it('merges my schedule with market events sorted by date', () => {
  const merged = mergeCalendar(
    [mine('2026-07-15', '실적 확인', 'earnings')],
    [market('2026-07-14', '중국 2분기 GDP')],
  );
  expect(merged.map((i) => i.label)).toEqual(['중국 2분기 GDP', '실적 확인']);
  expect(merged[0].kind).toBe('market');
  expect(merged[0].starred).toBe(true);   // importance high
  expect(merged[1].starred).toBe(true);   // earnings
  expect(merged[1].ticker).toBe('NVDA');
});

it('groups unified items by month', () => {
  const merged = mergeCalendar(
    [mine('2026-07-15', 'a'), mine('2026-08-05', 'c')],
    [market('2026-07-14', 'b', 'normal')],
  );
  const g = groupByMonth(merged);
  expect(g).toHaveLength(2);
  expect(g[0].month).toBe('2026-07');
  expect(g[0].items.map((i) => i.label)).toEqual(['b', 'a']);
  expect(formatMonth('2026-08')).toBe('8월');
});
