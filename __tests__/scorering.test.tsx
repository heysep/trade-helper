import { render } from '@testing-library/react-native';
import { ScoreRing, scoreColor } from '../src/components/ScoreRing';
import { colors } from '../src/theme';

describe('scoreColor', () => {
  it('bands: >=70 up, 40-69 gold, <40 down', () => {
    expect(scoreColor(85)).toBe(colors.tradingUp);
    expect(scoreColor(70)).toBe(colors.tradingUp);
    expect(scoreColor(55)).toBe(colors.primary);
    expect(scoreColor(40)).toBe(colors.primary);
    expect(scoreColor(20)).toBe(colors.tradingDown);
  });
});

it('renders score number', () => {
  const { getByText } = render(<ScoreRing score={72} />);
  expect(getByText('72')).toBeTruthy();
  expect(getByText('점')).toBeTruthy();
});
