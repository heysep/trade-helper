// 시세 프록시: 클라이언트 CORS 제약 없이 티커 확인·차트 데이터 제공 (키 불필요, Yahoo 공개 엔드포인트)
const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function toYahooSymbol(ticker: string, market: string): string {
  return market === "KRX" ? `${ticker}.KS` : ticker;
}

export async function handleMarketData(req: Request, fetchFn: typeof fetch = fetch): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  try {
    const { ticker, market, range } = await req.json() as { ticker?: string; market?: string; range?: string };
    if (!ticker || !market) {
      return new Response(JSON.stringify({ error: "ticker, market required" }), { status: 400, headers: CORS_HEADERS });
    }
    const symbol = toYahooSymbol(ticker.toUpperCase(), market);
    const safeRange = ["5d", "1mo", "3mo", "6mo", "1y"].includes(range ?? "") ? range : "3mo";
    const res = await fetchFn(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=${safeRange}&interval=1d`,
      { headers: { "User-Agent": "Mozilla/5.0" } },
    );
    if (!res.ok) {
      return new Response(JSON.stringify({ exists: false, closes: [] }), { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
    }
    const data = await res.json();
    const raw: (number | null)[] = data?.chart?.result?.[0]?.indicators?.quote?.[0]?.close ?? [];
    const closes = raw.filter((v: number | null): v is number => typeof v === "number");
    return new Response(JSON.stringify({ exists: closes.length >= 2, closes }), {
      status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: CORS_HEADERS });
  }
}

if (import.meta.main) Deno.serve((req) => handleMarketData(req));
