import { toTVSymbol } from '../src/components/TVChart';

it('maps KRX and US symbols', () => {
  expect(toTVSymbol('005930', 'KRX')).toBe('KRX:005930');
  expect(toTVSymbol('NVDA', 'US')).toBe('NVDA');
});
