import { tickerExists } from '../src/lib/ticker';

const mkFetch = (status: number, body: unknown) =>
  jest.fn().mockResolvedValue({ ok: status === 200, status, json: async () => body }) as unknown as typeof fetch;

it('true when closes exist', async () => {
  const f = mkFetch(200, { chart: { result: [{ indicators: { quote: [{ close: [1, 2, null] }] } }] } });
  await expect(tickerExists('NVDA', 'US', f)).resolves.toBe(true);
});

it('false on 404 (unknown symbol)', async () => {
  const f = mkFetch(404, {});
  await expect(tickerExists('ZZZZZZ', 'US', f)).resolves.toBe(false);
});

it('false when no price data', async () => {
  const f = mkFetch(200, { chart: { result: [{ indicators: { quote: [{ close: [null, null] }] } }] } });
  await expect(tickerExists('RAM', 'US', f)).resolves.toBe(false);
});

it('null on network/CORS failure (skip validation)', async () => {
  const f = jest.fn().mockRejectedValue(new Error('cors')) as unknown as typeof fetch;
  await expect(tickerExists('NVDA', 'US', f)).resolves.toBeNull();
});

it('maps KRX suffix', async () => {
  const f = mkFetch(200, { chart: { result: [{ indicators: { quote: [{ close: [70000] }] } }] } });
  await tickerExists('005930', 'KRX', f);
  expect((f as jest.Mock).mock.calls[0][0]).toContain('005930.KS');
});
