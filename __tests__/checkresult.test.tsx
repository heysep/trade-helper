import { render } from '@testing-library/react-native';
import { CheckResultCard } from '../src/components/CheckResultCard';

const item = {
  id: 'r1', thesis_id: 't1', check_date: '2026-07-09', opinion: 'watch' as const,
  rationale: '핵심 고객 CAPEX 가이던스 하향 발표. 가설 약화 신호.', scan_ref: null, add_signal: false,
  theses: { id: 't1', holdings: { ticker: 'NVDA', name: '엔비디아' } },
};

it('renders name, badge, rationale', () => {
  const { getByText } = render(<CheckResultCard item={item} onPress={() => {}} />);
  expect(getByText('엔비디아')).toBeTruthy();
  expect(getByText('관찰')).toBeTruthy();
  expect(getByText(/CAPEX 가이던스 하향/)).toBeTruthy();
});
