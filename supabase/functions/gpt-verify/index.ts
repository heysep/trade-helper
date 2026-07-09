import { createClient } from "@supabase/supabase-js";
import { callOpenAI, parseJsonBlock } from "../_shared/openai.ts";

interface VerifyResult {
  soundness: string;
  counterpoints: string[];
  check_conditions: Array<{ label: string; event_type: "earnings" | "guidance" | "metric" | "custom"; next_check_date: string | null }>;
}

export function buildVerifyPrompt(p: { name: string; ticker: string; market: string; buy_reason: string; break_conditions: string; target_horizon: string; today: string }): string {
  return `당신은 투자 가설 검증 보조 도구다. 자문·추천이 아니라 논리 점검과 일정 추출만 한다. "매수/매도하세요" 같은 표현 금지.
오늘: ${p.today}
종목: ${p.name} (${p.market}:${p.ticker})
매수 가설: ${p.buy_reason}
깨지는 조건: ${p.break_conditions}
목표 보유 기간: ${p.target_horizon}

웹검색으로 이 종목의 다가오는 이벤트(실적발표일 등)를 확인하고, 다음 JSON만 출력:
{"soundness":"가설의 논리 타당성 평가와 빠진 관점 (한국어 3-5문장)","counterpoints":["가설이 깨질 수 있는 시나리오 2-4개"],"check_conditions":[{"label":"확인 항목","event_type":"earnings|guidance|metric|custom","next_check_date":"YYYY-MM-DD 또는 null"}]}`;
}

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

export async function handleVerify(req: Request, deps?: { callFn?: typeof callOpenAI }): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  try {
    const { thesis_id } = await req.json();
    if (!thesis_id) return new Response(JSON.stringify({ error: "thesis_id required" }), { status: 400, headers: CORS_HEADERS });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );
    const { data: thesis, error } = await supabase
      .from("theses").select("*, holdings!inner(name, ticker, market)").eq("id", thesis_id).single();
    if (error || !thesis) return new Response(JSON.stringify({ error: "thesis not found" }), { status: 404, headers: CORS_HEADERS });

    const call = deps?.callFn ?? callOpenAI;
    const raw = await call({
      model: Deno.env.get("OPENAI_MODEL_SCAN") ?? "gpt-5",
      input: buildVerifyPrompt({
        name: thesis.holdings.name, ticker: thesis.holdings.ticker, market: thesis.holdings.market,
        buy_reason: thesis.buy_reason, break_conditions: thesis.break_conditions,
        target_horizon: thesis.target_horizon, today: new Date().toISOString().slice(0, 10),
      }),
      webSearch: true, maxOutputTokens: 6000, reasoningEffort: 'low',
    });
    const result = parseJsonBlock<VerifyResult>(raw);

    await supabase.from("theses").update({
      soundness_review: { soundness: result.soundness, counterpoints: result.counterpoints },
    }).eq("id", thesis_id);
    if (result.check_conditions.length) {
      await supabase.from("check_conditions").insert(
        result.check_conditions.map((c) => ({ thesis_id, label: c.label, event_type: c.event_type, next_check_date: c.next_check_date })),
      );
    }
    return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: CORS_HEADERS });
  }
}

if (import.meta.main) Deno.serve((req) => handleVerify(req));
