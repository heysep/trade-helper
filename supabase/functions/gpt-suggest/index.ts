import { callOpenAI, parseJsonBlock, stripLinks } from "../_shared/openai.ts";

interface SuggestResult {
  reasons: Array<{ text: string; watch_items: string[] }>;
  break_candidates: string[];
  add_candidates: string[];
}

export function buildSuggestPrompt(p: { name: string; ticker: string; market: string; today: string }): string {
  return `당신은 투자 가설 작성 도우미다. 자문·추천이 아니라, 이 종목에 대해 시장에서 흔히 논의되는 투자 논거를 정리해줄 뿐이다. "매수하세요" 표현 금지.
오늘: ${p.today}
종목: ${p.name} (${p.market}:${p.ticker})

웹검색으로 이 종목의 최근 상황을 확인하고, 다음 JSON만 출력:
{"reasons":[{"text":"매수 논거 한 문장 (쉬운 말, 40자 이내)","watch_items":["이 논거가 유효한지 확인할 감시 항목 1-2개 (20자 이내)"]}],"break_candidates":["가설이 깨지는 조건 후보 3-4개, 각 한 문장"],"add_candidates":["추가매수 조건 후보 2-3개, 각 한 문장"]}

작성 규칙:
- reasons는 서로 다른 관점 3-4개 (성장·밸류에이션·사이클·이벤트 등).
- 쉬운 일상어. 전문용어는 짧게 풀어쓰기. URL·링크 금지.
- 반드시 완전한 JSON.`;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export async function handleSuggest(req: Request, deps?: { callFn?: typeof callOpenAI }): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  try {
    const { name, ticker, market } = await req.json() as { name?: string; ticker?: string; market?: string };
    if (!name || !ticker || !market) {
      return new Response(JSON.stringify({ error: "name, ticker, market required" }), { status: 400, headers: CORS_HEADERS });
    }
    const call = deps?.callFn ?? callOpenAI;
    const raw = await call({
      model: Deno.env.get("OPENAI_MODEL_VERIFY") ?? "gpt-5-mini",
      input: buildSuggestPrompt({ name, ticker, market, today: new Date().toISOString().slice(0, 10) }),
      webSearch: true, maxOutputTokens: 6000, reasoningEffort: "low",
    });
    const parsed = parseJsonBlock<SuggestResult>(raw);
    const result: SuggestResult = {
      reasons: (parsed.reasons ?? []).slice(0, 4).map((r) => ({
        text: stripLinks(r.text), watch_items: (r.watch_items ?? []).slice(0, 2).map(stripLinks),
      })),
      break_candidates: (parsed.break_candidates ?? []).slice(0, 4).map(stripLinks),
      add_candidates: (parsed.add_candidates ?? []).slice(0, 3).map(stripLinks),
    };
    return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: CORS_HEADERS });
  }
}

if (import.meta.main) Deno.serve((req) => handleSuggest(req));
