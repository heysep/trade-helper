import { tickerExists, fetchMarketData } from '../src/lib/ticker';

jest.mock('../src/lib/supabase', () => ({
  supabase: {
    functions: {
      invoke: jest.fn(async (_name: string, { body }: { body: { ticker: string } }) => {
        if (body.ticker === 'NVDA') return { data: { exists: true, closes: [1, 2, 3] }, error: null };
        if (body.ticker === 'ZZZZZZ') return { data: { exists: false, closes: [] }, error: null };
        return { data: null, error: new Error('network') };
      }),
    },
  },
}));

it('true when proxy says exists', async () => {
  await expect(tickerExists('NVDA', 'US')).resolves.toBe(true);
});
it('false when proxy says missing', async () => {
  await expect(tickerExists('ZZZZZZ', 'US')).resolves.toBe(false);
});
it('null on error (skip validation)', async () => {
  await expect(tickerExists('ERR', 'US')).resolves.toBeNull();
});
it('fetchMarketData returns closes', async () => {
  const d = await fetchMarketData('NVDA', 'US');
  expect(d?.closes).toEqual([1, 2, 3]);
});
