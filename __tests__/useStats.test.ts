import { computeStats } from '../src/hooks/useStats';
import type { Thesis } from '../src/types/db';

const t = (over: Partial<Thesis>): Thesis => ({
  id: 'x', holding_id: 'h', user_id: 'u', buy_reason: 'r', break_conditions: 'b',
  add_conditions: null, target_horizon: '1y', soundness_review: null,
  status: 'active', opened_at: '2026-01-01T00:00:00Z', closed_at: null, outcome: null, ...over,
});

it('computes counts and average holding days', () => {
  const s = computeStats([
    t({}),
    t({ status: 'closed', outcome: 'success', opened_at: '2026-01-01T00:00:00Z', closed_at: '2026-01-11T00:00:00Z' }),
    t({ status: 'closed', outcome: 'fail', opened_at: '2026-01-01T00:00:00Z', closed_at: '2026-01-31T00:00:00Z' }),
  ]);
  expect(s.total).toBe(3);
  expect(s.active).toBe(1);
  expect(s.success).toBe(1);
  expect(s.fail).toBe(1);
  expect(s.avgHoldingDays).toBe(20); // (10+30)/2
  expect(s.failedTheses).toHaveLength(1);
});

it('handles empty list', () => {
  const s = computeStats([]);
  expect(s.total).toBe(0);
  expect(s.avgHoldingDays).toBeNull();
});
