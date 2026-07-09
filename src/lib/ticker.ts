import { toYahooSymbol } from '@/components/PriceChart';

/**
 * 티커 존재 확인 (등록 시점 오입력 방지).
 * true = 존재 · false = 없음 · null = 확인 불가(웹 CORS/네트워크) → 통과시킴
 */
export async function tickerExists(
  ticker: string,
  market: 'KRX' | 'US',
  fetchFn: typeof fetch = fetch,
): Promise<boolean | null> {
  try {
    const symbol = toYahooSymbol(ticker.toUpperCase(), market);
    const res = await fetchFn(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`);
    if (!res.ok) return res.status === 404 ? false : null;
    const data = await res.json();
    const result = data?.chart?.result?.[0];
    const closes: (number | null)[] = result?.indicators?.quote?.[0]?.close ?? [];
    return closes.some((v) => typeof v === 'number');
  } catch {
    return null; // 웹 CORS 등 — 검증 스킵
  }
}
