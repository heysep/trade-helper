import { groupByMonth, formatMonth } from '../src/components/CalendarRow';

const item = (date: string, label: string) => ({
  id: label, thesis_id: 't', label, event_type: 'metric' as const,
  next_check_date: date, status: 'open' as const,
  theses: { id: 't', holdings: { ticker: 'NVDA' } },
});

it('groups sorted items by month', () => {
  const g = groupByMonth([item('2026-07-15', 'a'), item('2026-07-28', 'b'), item('2026-08-05', 'c')]);
  expect(g).toHaveLength(2);
  expect(g[0].month).toBe('2026-07');
  expect(g[0].items.map((i) => i.label)).toEqual(['a', 'b']);
  expect(formatMonth('2026-08')).toBe('8월');
});
