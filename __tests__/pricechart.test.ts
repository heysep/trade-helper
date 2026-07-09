import { toYahooSymbol, buildLinePath, mockSeries } from '../src/components/PriceChart';

describe('toYahooSymbol', () => {
  it('maps KRX to .KS suffix, US passthrough', () => {
    expect(toYahooSymbol('005930', 'KRX')).toBe('005930.KS');
    expect(toYahooSymbol('NVDA', 'US')).toBe('NVDA');
  });
});

describe('buildLinePath', () => {
  it('builds svg path scaled to box', () => {
    const path = buildLinePath([1, 2, 3], 100, 50);
    expect(path.startsWith('M')).toBe(true);
    expect(path.split(' L')).toHaveLength(3);
    // min(1) → y=50(bottom), max(3) → y=0(top)
    expect(path).toContain('0,50');
    expect(path).toContain('100,0');
  });
  it('handles flat series without NaN', () => {
    const path = buildLinePath([5, 5, 5], 100, 50);
    expect(path).not.toContain('NaN');
  });
});

describe('mockSeries', () => {
  it('deterministic per ticker, 60 points', () => {
    expect(mockSeries('NVDA')).toEqual(mockSeries('NVDA'));
    expect(mockSeries('NVDA')).not.toEqual(mockSeries('TSLA'));
    expect(mockSeries('NVDA')).toHaveLength(60);
  });
});
