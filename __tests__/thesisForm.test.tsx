import { validateThesisInput } from '../src/lib/validate';

it('requires buy_reason and break_conditions', () => {
  expect(validateThesisInput({ buy_reason: '', break_conditions: 'x', target_horizon: '1y' })).toContain('매수 이유');
  expect(validateThesisInput({ buy_reason: 'x', break_conditions: '', target_horizon: '1y' })).toContain('깨지는 조건');
  expect(validateThesisInput({ buy_reason: 'x', break_conditions: 'y', target_horizon: '' })).toContain('보유 기간');
  expect(validateThesisInput({ buy_reason: 'x', break_conditions: 'y', target_horizon: '1y' })).toBeNull();
});
