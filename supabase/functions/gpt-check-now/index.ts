import { createClient } from "@supabase/supabase-js";
import { callOpenAI, parseJsonBlock, stripLinks } from "../_shared/openai.ts";
import { buildScanPrompt, buildEvalPrompt } from "../daily-batch/index.ts";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface ScanJson { summary: string; change_level: "none" | "minor" | "major"; sources: string[] }
interface EvalJson { opinion: "hold" | "watch" | "reduce" | "exit"; rationale: string; checks?: Array<{ label: string; state?: string; why?: string }>; broken?: Array<{ label: string; why?: string }>; add_signal?: boolean }

/** 사용자가 누른 즉시 점검: 해당 가설 하나만 스캔+판정 (오늘 결과 갱신) */
export async function handleCheckNow(req: Request, deps?: { callFn?: typeof callOpenAI }): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS_HEADERS });
  try {
    const { thesis_id } = await req.json() as { thesis_id?: string };
    if (!thesis_id) return new Response(JSON.stringify({ error: "thesis_id required" }), { status: 400, headers: CORS_HEADERS });

    // 소유권은 사용자 JWT + RLS로 확인
    const userDb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: req.headers.get("Authorization")! } } },
    );
    const { data: thesis, error } = await userDb
      .from("theses").select("*, holdings!inner(name, ticker, market)").eq("id", thesis_id).single();
    if (error || !thesis) return new Response(JSON.stringify({ error: "thesis not found" }), { status: 404, headers: CORS_HEADERS });

    const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const call = deps?.callFn ?? callOpenAI;
    const todayStr = new Date().toISOString().slice(0, 10);
    const h = thesis.holdings as { name: string; ticker: string; market: string };

    // 1) 신선한 스캔 (수동 점검은 강제 갱신 — 방금 나온 뉴스 반영)
    const rawScan = await call({
      model: Deno.env.get("OPENAI_MODEL_SCAN") ?? "gpt-5",
      input: buildScanPrompt({ ticker: h.ticker, market: h.market, name: h.name, today: todayStr }),
      webSearch: true, maxOutputTokens: 5000, reasoningEffort: "low",
    });
    const scan = parseJsonBlock<ScanJson>(rawScan);
    const { data: scanRow } = await db.from("daily_scans")
      .upsert({ ticker: h.ticker, market: h.market, scan_date: todayStr, summary: stripLinks(scan.summary), change_level: scan.change_level, sources: scan.sources }, { onConflict: "ticker,market,scan_date" })
      .select().single();

    // 2) 판정 (수동은 change_level 무관하게 항상 평가)
    const { data: conds } = await db.from("check_conditions").select("id, label").eq("thesis_id", thesis_id).eq("status", "open");
    const watchLabels = (conds ?? []).map((c: { label: string }) => c.label);
    const rawEval = await call({
      model: Deno.env.get("OPENAI_MODEL_EVAL") ?? "gpt-5-mini",
      input: buildEvalPrompt({ buy_reason: thesis.buy_reason, break_conditions: thesis.break_conditions, add_conditions: thesis.add_conditions, summary: stripLinks(scan.summary), today: todayStr, watch_labels: watchLabels }),
      maxOutputTokens: 3500, reasoningEffort: "low",
    });
    const ev = parseJsonBlock<EvalJson>(rawEval);
    const rationale = stripLinks(ev.rationale);
    const addSignal = ev.add_signal === true;

    // 3) 오늘 결과 갱신 (있으면 덮어씀)
    await db.from("check_results").upsert(
      { thesis_id, check_date: todayStr, opinion: ev.opinion, rationale, scan_ref: scanRow?.id ?? null, add_signal: addSignal },
      { onConflict: "thesis_id,check_date" },
    );

    // 4) 감시 상태 갱신 — 전 항목 상태+사유, 응답에 없는 항목은 정상 처리
    const stateMap = new Map<string, { state: string; why: string }>();
    for (const c of ev.checks ?? []) stateMap.set(c.label.trim(), { state: c.state === "broken" ? "broken" : "ok", why: stripLinks(c.why ?? "") });
    for (const b of ev.broken ?? []) stateMap.set(b.label.trim(), { state: "broken", why: stripLinks(b.why ?? "") });
    for (const c of (conds ?? []) as Array<{ id: string; label: string }>) {
      const st = stateMap.get(c.label.trim());
      await db.from("check_conditions").update({
        condition_state: st?.state ?? "ok",
        state_note: st?.why || null,
      }).eq("id", c.id);
    }

    return new Response(JSON.stringify({
      opinion: ev.opinion, rationale, add_signal: addSignal,
      summary: stripLinks(scan.summary), change_level: scan.change_level,
      broken: [...stateMap.entries()].filter(([, v]) => v.state === "broken").map(([k]) => k),
    }), { status: 200, headers: { "Content-Type": "application/json", ...CORS_HEADERS } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: CORS_HEADERS });
  }
}

if (import.meta.main) Deno.serve((req) => handleCheckNow(req));
