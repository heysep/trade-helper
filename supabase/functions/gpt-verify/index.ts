import { createClient } from "@supabase/supabase-js";
import { callOpenAI, parseJsonBlock, stripLinks } from "../_shared/openai.ts";

interface VerifyResult {
  score: number;
  summary: string;
  add_candidates: string[];
  reason_reviews: Array<{ reason: string; verdict: "타당" | "부분 타당" | "약함"; comment: string }>;
  missing_points: string[];
  counterpoints: string[];
  check_conditions: Array<{ label: string; for_reason?: string; event_type: "earnings" | "guidance" | "metric" | "custom"; next_check_date: string | null }>;
}

export function buildVerifyPrompt(p: { name: string; ticker: string; market: string; buy_reason: string; break_conditions: string; target_horizon: string; today: string }): string {
  return `당신은 투자 가설 점검 도우미다. 자문·추천이 아니라, 사용자가 쓴 매수 이유를 하나씩 점검해주는 역할이다. "매수/매도하세요" 같은 표현 금지.
오늘: ${p.today}
종목: ${p.name} (${p.market}:${p.ticker})
사용자의 매수 이유: ${p.buy_reason}
깨지는 조건: ${p.break_conditions}
목표 보유 기간: ${p.target_horizon}

먼저 사용자의 매수 이유를 개별 논점으로 나눠라 (번호·줄바꿈·문장 단위).
그 다음 웹검색으로 종목의 실제 상황과 다가오는 이벤트(실적발표일 등)를 확인하고, 다음 JSON만 출력:
{"score":0,"summary":"한 줄 총평 (40자 이내)","reason_reviews":[{"reason":"논점 요약 (20자 이내)","verdict":"타당|부분 타당|약함","comment":"왜 그런지 쉬운 말 1-2문장"}],"missing_points":["사용자가 놓친 관점 1-3개, 각 한 문장"],"counterpoints":["가설이 깨질 수 있는 시나리오 2-4개, 각 한 문장"],"add_candidates":["추가매수를 고려할 만한 조건 후보 2-3개, 각 한 문장"],"check_conditions":[{"label":"확인 항목 (25자 이내)","for_reason":"이 항목이 검증하는 논점 (reason_reviews의 reason과 똑같은 문구)","event_type":"earnings|guidance|metric|custom","next_check_date":"YYYY-MM-DD 또는 null"}]}

score 채점 기준 (0~100 정수):
- 사실 부합성 40점: 논거가 실제 데이터·뉴스와 맞는가
- 논리 연결 30점: 근거→결론 인과가 끊기지 않는가
- 리스크 인지 30점: 깨지는 조건이 구체적이고 핵심 리스크를 덮는가
- 티커 오지정이면 30점 이하.

작성 규칙:
- 모든 문장은 쉬운 일상어로 써라. 어려운 용어를 쓰면 바로 뒤에 짧게 풀어써라. 예: "포워드 PER(내년 이익 대비 주가 배수)".
- 한 문장 50자 이내. 완결된 문장으로, 중간에 끊지 마라.
- URL·마크다운 링크·괄호 출처표기 절대 금지.
- verdict 기준: 사실과 부합하고 논리 연결이 강하면 "타당", 방향은 맞지만 조건부/근거 부족이면 "부분 타당", 사실과 다르거나 논리가 끊기면 "약함".
- 자산 유형을 먼저 판별하라:
  · ETF/펀드 → 단일기업 지표(PER·수주잔고)가 안 맞는 논점은 verdict "약함" 처리하고 comment에서 섹터·편입종목 관점으로 바꿔 설명하라.
  · 존재하지 않거나 상장폐지된 티커 → reason_reviews 첫 항목 reason을 "⚠️ 티커 확인 필요"로, comment에 어떤 종목인지 설명.
- 반드시 완전하고 유효한 JSON으로 끝내라.`;
}

export function buildRevisePrompt(p: { buy_reason: string; break_conditions: string; add_conditions: string | null; review: unknown }): string {
  return `당신은 투자 가설 수정 도우미다. 아래 사용자의 가설과 AI 점검 피드백을 반영해, 가설을 더 구체적이고 검증 가능하게 다듬어라. 사용자의 원래 의도와 관점은 유지하고, 피드백에서 지적된 약점만 보완하라. "매수하세요" 표현 금지.

[현재 가설]
매수 이유: ${p.buy_reason}
깨지는 조건: ${p.break_conditions}
추가매수 조건: ${p.add_conditions ?? "(없음)"}

[AI 점검 피드백]
${JSON.stringify(p.review)}

다음 JSON만 출력 (URL 금지, 쉬운 말):
{"buy_reason":"수정된 매수 이유","break_conditions":"수정된 깨지는 조건 (정량 기준 포함)","add_conditions":"수정된 추가매수 조건 또는 null","note":"무엇을 바꿨는지 한 문장"}

작성 규칙:
- 각 필드는 번호 목록으로: "1. …\\n2. …" 형식, 항목당 한 문장 (40자 이내).
- 필드별 문체를 지켜라:
  · buy_reason = "왜 샀는가"의 서술문. "~하고 있다", "~일 것으로 본다" 처럼 현재 상황·전망을 말하라. "~확인시", "~상향시" 같은 조건문 절대 금지 (그건 조건 필드 몫이다). 예: "AI 서버 수요로 DRAM 출하량이 빠르게 늘고 있다".
  · break_conditions / add_conditions = 조건문("~시", 수치 기준 포함)으로.
- buy_reason도 피드백을 반영해 다듬되, 사용자의 원래 관점은 유지.
- 항목 수는 원문과 비슷하게. 원문보다 길어지지 마라. 전체적으로 짧고 명확하게.`;
}

interface ReviseResult { buy_reason: string; break_conditions: string; add_conditions: string | null; note: string }

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function sanitizeResult(parsed: VerifyResult): VerifyResult {
  return {
    score: Math.max(0, Math.min(100, Math.round(Number(parsed.score) || 0))),
    summary: stripLinks(parsed.summary ?? ""),
    reason_reviews: (parsed.reason_reviews ?? []).map((r) => ({ ...r, reason: stripLinks(r.reason), comment: stripLinks(r.comment) })),
    missing_points: (parsed.missing_points ?? []).map(stripLinks),
    counterpoints: (parsed.counterpoints ?? []).map(stripLinks),
    add_candidates: (parsed.add_candidates ?? []).map(stripLinks),
    check_conditions: (parsed.check_conditions ?? []).map((c) => ({ ...c, label: stripLinks(c.label), for_reason: c.for_reason ? stripLinks(c.for_reason) : undefined })),
  };
}

// deno-lint-ignore no-explicit-any
async function persistResult(supabase: any, thesis_id: string, result: VerifyResult): Promise<void> {
  await supabase.from("theses").update({
    soundness_review: {
      score: result.score,
      summary: result.summary,
      reason_reviews: result.reason_reviews,
      missing_points: result.missing_points,
      counterpoints: result.counterpoints,
      add_candidates: result.add_candidates,
    },
  }).eq("id", thesis_id);
  // 재검증 시 AI 생성 조건만 갈아끼움 — 사용자가 직접 고른 감시 항목(source=user)은 보존
  await supabase.from("check_conditions").delete().eq("thesis_id", thesis_id).eq("status", "open").eq("source", "ai");
  const rows = [
    // 사용자의 논점 자체를 감시 대상으로 (label == reason_label 인 행이 논점 행)
    ...result.reason_reviews.map((r) => ({
      thesis_id, label: r.reason, reason_label: r.reason,
      event_type: "custom", next_check_date: null, source: "ai",
    })),
    ...result.check_conditions.map((c) => ({
      thesis_id, label: c.label, reason_label: c.for_reason ?? null,
      event_type: c.event_type, next_check_date: c.next_check_date, source: "ai",
    })),
  ];
  if (rows.length) {
    await supabase.from("check_conditions").insert(rows);
  }
}

export async function handleVerify(req: Request, deps?: { callFn?: typeof callOpenAI }): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  try {
    // save=false → GPT 결과만 반환 (미리보기). apply → GPT 없이 전달된 결과 저장. revise → 피드백 반영 수정안 생성 (저장 안 함).
    const { thesis_id, save, apply, revise } = await req.json() as { thesis_id?: string; save?: boolean; apply?: VerifyResult; revise?: boolean };
    if (!thesis_id) return new Response(JSON.stringify({ error: "thesis_id required" }), { status: 400, headers: CORS_HEADERS });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );
    const { data: thesis, error } = await supabase
      .from("theses").select("*, holdings!inner(name, ticker, market)").eq("id", thesis_id).single();
    if (error || !thesis) return new Response(JSON.stringify({ error: "thesis not found" }), { status: 404, headers: CORS_HEADERS });

    // 피드백 반영 수정안: 기존 점검 결과 기반, 웹검색 없이 저가 호출. 저장은 클라이언트가 확인 후.
    if (revise) {
      if (!thesis.soundness_review) {
        return new Response(JSON.stringify({ error: "review required before revise" }), { status: 400, headers: CORS_HEADERS });
      }
      const call2 = deps?.callFn ?? callOpenAI;
      const rawRevise = await call2({
        model: Deno.env.get("OPENAI_MODEL_EVAL") ?? "gpt-5-mini",
        input: buildRevisePrompt({
          buy_reason: thesis.buy_reason, break_conditions: thesis.break_conditions,
          add_conditions: thesis.add_conditions, review: thesis.soundness_review,
        }),
        maxOutputTokens: 3000, reasoningEffort: "low",
      });
      const rev = parseJsonBlock<ReviseResult>(rawRevise);
      const cleaned: ReviseResult = {
        buy_reason: stripLinks(rev.buy_reason ?? ""),
        break_conditions: stripLinks(rev.break_conditions ?? ""),
        add_conditions: rev.add_conditions ? stripLinks(rev.add_conditions) : null,
        note: stripLinks(rev.note ?? ""),
      };
      return new Response(JSON.stringify(cleaned), { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
    }

    // 덮어쓰기 확정: 미리보기로 받아둔 결과를 GPT 재호출 없이 저장
    if (apply) {
      const applied = sanitizeResult(apply);
      await persistResult(supabase, thesis_id, applied);
      return new Response(JSON.stringify(applied), { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
    }

    const call = deps?.callFn ?? callOpenAI;
    const raw = await call({
      // 재검증을 부담 없이 여러 번 돌릴 수 있게 기본은 저가 모델 (env로 상향 가능)
      model: Deno.env.get("OPENAI_MODEL_VERIFY") ?? "gpt-5-mini",
      input: buildVerifyPrompt({
        name: thesis.holdings.name, ticker: thesis.holdings.ticker, market: thesis.holdings.market,
        buy_reason: thesis.buy_reason, break_conditions: thesis.break_conditions,
        target_horizon: thesis.target_horizon, today: new Date().toISOString().slice(0, 10),
      }),
      // verify는 종목·가설당 1회성 — 품질 우선 (medium + 넉넉한 토큰)
      webSearch: true, maxOutputTokens: 10000, reasoningEffort: 'medium',
    });
    const result = sanitizeResult(parseJsonBlock<VerifyResult>(raw));

    if (save !== false) await persistResult(supabase, thesis_id, result);
    return new Response(JSON.stringify(result), { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: CORS_HEADERS });
  }
}

if (import.meta.main) Deno.serve((req) => handleVerify(req));
