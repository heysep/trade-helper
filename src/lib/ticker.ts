import { supabase } from './supabase';

export interface MarketData { exists: boolean; closes: number[] }

/** 서버 프록시로 시세 조회 — 웹/네이티브 동일 동작 (CORS 무관) */
export async function fetchMarketData(ticker: string, market: 'KRX' | 'US', range = '3mo'): Promise<MarketData | null> {
  try {
    const { data, error } = await supabase.functions.invoke('market-data', { body: { ticker, market, range } });
    if (error) return null;
    return data as MarketData;
  } catch {
    return null;
  }
}

/**
 * 티커 존재 확인 (등록 시점 오입력 방지).
 * true = 존재 · false = 없음 · null = 확인 불가(네트워크) → 통과시킴
 */
export async function tickerExists(ticker: string, market: 'KRX' | 'US'): Promise<boolean | null> {
  const d = await fetchMarketData(ticker, market, '5d');
  return d ? d.exists : null;
}
