import { createClient } from "@supabase/supabase-js";
import { callOpenAI, parseJsonBlock } from "../_shared/openai.ts";

export function shouldRunToday(d: Date): boolean {
  const day = d.getUTCDay();
  return day !== 0 && day !== 6; // MVP: 주말 스킵. 공휴일 캘린더는 Phase 2.
}

export function decideEval(scan: { change_level: string }): "skip" | "eval" {
  return scan.change_level === "none" ? "skip" : "eval";
}

export function buildScanPrompt(p: { ticker: string; market: string; name: string; today: string }): string {
  return `당신은 종목 데일리 스캐너다. 오늘(${p.today}) 기준 ${p.name}(${p.market}:${p.ticker})에 대해 웹검색으로 최근 24-48시간 내 투자 판단에 영향을 줄 뉴스·공시·실적·가이던스 변화만 확인하라. 루머·주가등락 자체는 제외. 다음 JSON만 출력:
{"summary":"핵심 변화 요약 (한국어 2-4문장, 변화 없으면 '특이사항 없음')","change_level":"none|minor|major","sources":["url1","url2"]}`;
}

export function buildEvalPrompt(p: { buy_reason: string; break_conditions: string; summary: string; today: string }): string {
  return `당신은 투자 가설 점검 보조 도구다. 자문·추천 금지. "매수/매도하세요" 표현 금지. 가설 대비 변화만 서술.
오늘: ${p.today}
사용자 가설: ${p.buy_reason}
깨지는 조건: ${p.break_conditions}
오늘 스캔 요약: ${p.summary}

스캔 내용이 가설/깨지는 조건에 미치는 영향을 판단해 다음 JSON만 출력:
{"opinion":"hold|watch|reduce|exit","rationale":"판단 근거 (한국어 2-4문장)"}`;
}

interface ScanJson { summary: string; change_level: "none" | "minor" | "major"; sources: string[] }
interface EvalJson { opinion: "hold" | "watch" | "reduce" | "exit"; rationale: string }

interface ThesisRow {
  id: string; user_id: string; buy_reason: string; break_conditions: string;
  holdings: { id: string; ticker: string; market: string; name: string };
}

export async function handleBatch(req: Request, deps?: { callFn?: typeof callOpenAI }): Promise<Response> {
  if (req.headers.get("x-batch-secret") !== Deno.env.get("BATCH_SECRET")) {
    return new Response("forbidden", { status: 403 });
  }
  const { market } = await req.json() as { market: "KRX" | "US" };
  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  if (!shouldRunToday(today)) {
    return new Response(JSON.stringify({ scanned: 0, evaluated: 0, skipped: 0, notified: 0, reason: "weekend" }), { status: 200 });
  }

  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const call = deps?.callFn ?? callOpenAI;
  const cap = parseInt(Deno.env.get("DAILY_WEBSEARCH_CAP") ?? "200", 10);
  const scanModel = Deno.env.get("OPENAI_MODEL_SCAN") ?? "gpt-5";
  const evalModel = Deno.env.get("OPENAI_MODEL_EVAL") ?? "gpt-5-mini";

  // 활성 가설 + 종목 로드
  const { data: theses, error } = await db
    .from("theses")
    .select("id, user_id, buy_reason, break_conditions, holdings!inner(id, ticker, market, name)")
    .neq("status", "closed")
    .eq("holdings.market", market);
  if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500 });

  // Stage 1: distinct 종목 스캔 (디둡)
  const rows = (theses ?? []) as unknown as ThesisRow[];
  const byTicker = new Map<string, { ticker: string; name: string; theses: ThesisRow[] }>();
  for (const t of rows) {
    const h = t.holdings;
    if (!byTicker.has(h.ticker)) byTicker.set(h.ticker, { ticker: h.ticker, name: h.name, theses: [] });
    byTicker.get(h.ticker)!.theses.push(t);
  }

  let scanned = 0, evaluated = 0, skipped = 0, notified = 0;
  const { data: usage } = await db.from("usage_daily").upsert({ usage_date: todayStr }, { onConflict: "usage_date" }).select().single();
  let webCalls = usage?.web_search_calls ?? 0;
  let evalCalls = usage?.eval_calls ?? 0;

  for (const [ticker, group] of byTicker) {
    try {
      // 이미 오늘 스캔 있으면 재사용 (디둡 + 재실행 안전)
      let { data: scan } = await db.from("daily_scans").select("*")
        .eq("ticker", ticker).eq("market", market).eq("scan_date", todayStr).maybeSingle();

      if (!scan) {
        if (webCalls >= cap) { console.error(`cap reached (${cap}), stopping scans`); break; }
        const raw = await call({ model: scanModel, input: buildScanPrompt({ ticker, market, name: group.name, today: todayStr }), webSearch: true, maxOutputTokens: 5000, reasoningEffort: 'low' });
        const parsed = parseJsonBlock<ScanJson>(raw);
        const { data: inserted } = await db.from("daily_scans")
          .insert({ ticker, market, scan_date: todayStr, summary: parsed.summary, change_level: parsed.change_level, sources: parsed.sources })
          .select().single();
        scan = inserted; scanned++; webCalls++;
        await db.from("usage_daily").update({ web_search_calls: webCalls }).eq("usage_date", todayStr);
      }
      if (!scan) continue;

      // Stage 2: 가설별 평가
      for (const t of group.theses) {
        const { data: exists } = await db.from("check_results").select("id").eq("thesis_id", t.id).eq("check_date", todayStr).maybeSingle();
        if (exists) continue;

        let opinion: EvalJson["opinion"] = "hold";
        let rationale = "오늘은 가설을 변경할 만한 새로운 정보가 없습니다.";
        if (decideEval(scan) === "eval") {
          const raw = await call({ model: evalModel, input: buildEvalPrompt({ buy_reason: t.buy_reason, break_conditions: t.break_conditions, summary: scan.summary, today: todayStr }), maxOutputTokens: 2000, reasoningEffort: 'low' });
          const ev = parseJsonBlock<EvalJson>(raw);
          opinion = ev.opinion; rationale = ev.rationale; evaluated++; evalCalls++;
          await db.from("usage_daily").update({ eval_calls: evalCalls }).eq("usage_date", todayStr);
        } else { skipped++; }

        await db.from("check_results").insert({ thesis_id: t.id, check_date: todayStr, opinion, rationale, scan_ref: scan.id });
        if (opinion !== "hold") {
          const { data: prof } = await db.from("profiles").select("expo_push_token").eq("id", t.user_id).single();
          if (prof?.expo_push_token) {
            await fetch("https://exp.host/--/api/v2/push/send", {
              method: "POST", headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ to: prof.expo_push_token, title: `${group.name} 가설 점검`, body: rationale.slice(0, 120) }),
            });
            notified++;
          }
        }
      }
    } catch (e) {
      console.error(`ticker ${ticker} failed: ${e}`); // 종목별 독립 — 전체 배치 중단 금지
    }
  }

  return new Response(JSON.stringify({ scanned, evaluated, skipped, notified }), { status: 200, headers: { "Content-Type": "application/json" } });
}

if (import.meta.main) Deno.serve((req) => handleBatch(req));
