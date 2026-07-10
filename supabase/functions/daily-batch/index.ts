import { createClient } from "@supabase/supabase-js";
import { callOpenAI, parseJsonBlock, stripLinks } from "../_shared/openai.ts";

export function shouldRunToday(d: Date): boolean {
  const day = d.getUTCDay();
  return day !== 0 && day !== 6; // MVP: 주말 스킵. 공휴일 캘린더는 Phase 2.
}

export function decideEval(scan: { change_level: string }): "skip" | "eval" {
  return scan.change_level === "none" ? "skip" : "eval";
}

export function buildScanPrompt(p: { ticker: string; market: string; name: string; today: string }): string {
  return `당신은 종목 데일리 스캐너다. 오늘(${p.today}) 기준 ${p.name}(${p.market}:${p.ticker})에 대해 웹검색으로 최근 24-48시간 내 투자 판단에 영향을 줄 뉴스·공시·실적·가이던스 변화만 확인하라. 루머·주가등락 자체는 제외. 다음 JSON만 출력:
{"summary":"핵심 변화 요약 (한국어 2-4문장, 변화 없으면 '특이사항 없음')","change_level":"none|minor|major","sources":["url1","url2"]}

작성 규칙: summary에는 URL·마크다운 링크 금지 (링크는 sources 배열에만). 문장 짧게.`;
}

export function buildEvalPrompt(p: { buy_reason: string; break_conditions: string; add_conditions?: string | null; summary: string; today: string; watch_labels?: string[] }): string {
  const watch = (p.watch_labels ?? []).length ? `\n감시 항목: ${p.watch_labels!.join(" / ")}` : "";
  const addc = p.add_conditions ? `\n추가매수 조건: ${p.add_conditions}` : "";
  return `당신은 투자 가설 점검 보조 도구다. 자문·추천 금지. "매수/매도하세요" 표현 금지. 가설 대비 변화만 서술.
오늘: ${p.today}
사용자 가설: ${p.buy_reason}
깨지는 조건: ${p.break_conditions}${addc}${watch}
오늘 스캔 요약: ${p.summary}

스캔 내용이 가설/깨지는 조건에 미치는 영향을 판단해 다음 JSON만 출력:
{"opinion":"hold|watch|reduce|exit","rationale":"판단 근거 (한국어 2-4문장)","broken_labels":["깨졌거나 위험해진 감시 항목 라벨 (없으면 빈 배열, 목록에 있는 것만)"],"add_signal":false}\n\nadd_signal: 추가매수 조건이 있고 오늘 스캔 기준으로 그 조건이 충족됐으면 true. 조건이 없거나 불충족이면 false.

작성 규칙: rationale에 URL·마크다운 링크 금지. 문장마다 \\n 줄바꿈, 짧게.`;
}

interface FeedEvent { title: string; country: string; date: string; impact: string }

// 무료 경제 캘린더 피드(ForexFactory) — 날짜는 API가 정확, GPT는 선별·한글화만
export async function fetchCalendarFeed(fetchFn: typeof fetch = fetch): Promise<FeedEvent[]> {
  const urls = [
    "https://nfs.faireconomy.media/ff_calendar_thisweek.json",
    "https://nfs.faireconomy.media/ff_calendar_nextweek.json",
  ];
  const all: FeedEvent[] = [];
  for (const u of urls) {
    try {
      const res = await fetchFn(u);
      if (res.ok) all.push(...(await res.json()) as FeedEvent[]);
    } catch (e) { console.error(`feed ${u} failed: ${e}`); }
  }
  return all.filter((e) => e.impact === "High" || e.impact === "Medium");
}

export function buildCuratePrompt(events: Array<{ title: string; country: string; date: string; impact: string }>): string {
  const lines = events.map((e) => `${e.date.slice(0, 10)}|${e.country}|${e.impact}|${e.title}`).join("\n");
  return `아래는 경제 일정 목록이다 (날짜|통화|중요도|이벤트). 이 목록 안에서만 골라라. 새 일정을 지어내지 마라.
주식 투자자에게 중요한 것 최대 12개를 선택해 한국어로 번역하고, 다음 JSON만 출력:
{"events":[{"event_date":"YYYY-MM-DD","label":"한국어 일정명 (25자 이내)","region":"US|CN|KR|EU|JP|global","importance":"high|normal"}]}
선택 기준: 금리결정·CPI·고용·GDP·PMI 우선. 같은 날 중복 지표는 대표 1개만. impact High는 importance high로.
통화→region: USD→US, CNY→CN, EUR→EU, JPY→JP, 나머지→global.

${lines}`;
}

export function buildKoreaMacroPrompt(today: string): string {
  return `오늘(${today})부터 14일 이내 예정된 한국 매크로 일정만 웹검색으로 확인하라 (금통위 금리결정, 수출입 통계, 산업활동동향 등. 개별 기업 실적 제외).
다음 JSON만 출력 (URL 금지, label 25자 이내, 없으면 빈 배열):
{"events":[{"event_date":"YYYY-MM-DD","label":"일정 이름","region":"KR","importance":"high|normal"}]}`;
}

interface MacroJson { events: Array<{ event_date: string; label: string; region: string; importance: string }> }

function normalizeEvents(parsed: MacroJson, todayStr: string) {
  return (parsed.events ?? [])
    .filter((e) => /^\d{4}-\d{2}-\d{2}$/.test(e.event_date) && e.event_date >= todayStr)
    .map((e) => ({
      event_date: e.event_date,
      label: stripLinks(e.label).slice(0, 50),
      region: ["US", "CN", "KR", "EU", "JP"].includes(e.region) ? e.region : "global",
      importance: e.importance === "high" ? "high" : "normal",
    }));
}

// 주 1회 수준 갱신 (전 유저 공유). 글로벌=피드+GPT선별(웹검색X), 한국=웹검색 1콜 보강.
// deno-lint-ignore no-explicit-any
async function ensureMacroEvents(db: any, call: typeof callOpenAI, _model: string, todayStr: string): Promise<number> {
  const { count } = await db.from("market_events")
    .select("id", { count: "exact", head: true })
    .gte("event_date", todayStr)
    .gte("fetched_at", new Date(Date.now() - 7 * 864e5).toISOString());
  if ((count ?? 0) >= 3) return 0; // 최근 7일 내 수집분이 충분 → 스킵

  const evalModel = Deno.env.get("OPENAI_MODEL_EVAL") ?? "gpt-5-mini";
  let rows: ReturnType<typeof normalizeEvents> = [];

  // 1) 글로벌: 피드 기반 선별 (정확한 날짜, GPT는 번역·선별만)
  const feed = await fetchCalendarFeed();
  if (feed.length) {
    const raw = await call({ model: evalModel, input: buildCuratePrompt(feed), maxOutputTokens: 3000, reasoningEffort: "low" });
    rows = rows.concat(normalizeEvents(parseJsonBlock<MacroJson>(raw), todayStr));
  }

  // 2) 한국: 피드 미포함 → 웹검색 보강
  try {
    const rawKr = await call({ model: evalModel, input: buildKoreaMacroPrompt(todayStr), webSearch: true, maxOutputTokens: 2500, reasoningEffort: "low" });
    rows = rows.concat(normalizeEvents(parseJsonBlock<MacroJson>(rawKr), todayStr));
  } catch (e) { console.error(`korea macro fetch failed: ${e}`); }

  if (rows.length) await db.from("market_events").upsert(rows, { onConflict: "event_date,label" });
  return rows.length;
}

interface ScanJson { summary: string; change_level: "none" | "minor" | "major"; sources: string[] }
interface EvalJson { opinion: "hold" | "watch" | "reduce" | "exit"; rationale: string; broken_labels?: string[]; add_signal?: boolean }

interface ThesisRow {
  id: string; user_id: string; buy_reason: string; break_conditions: string; add_conditions: string | null;
  holdings: { id: string; ticker: string; market: string; name: string };
}

export async function handleBatch(req: Request, deps?: { callFn?: typeof callOpenAI }): Promise<Response> {
  if (req.headers.get("x-batch-secret") !== Deno.env.get("BATCH_SECRET")) {
    return new Response("forbidden", { status: 403 });
  }
  const { market } = await req.json() as { market: "KRX" | "US" };
  const today = new Date();
  if (!shouldRunToday(today)) {
    return new Response(JSON.stringify({ scanned: 0, evaluated: 0, skipped: 0, notified: 0, reason: "weekend" }), { status: 200 });
  }

  // 게이트웨이 150초 타임아웃 회피: 즉시 202 응답, 실제 처리는 백그라운드 (결과는 DB로 확인)
  const work = runBatch(market, today, deps);
  // deno-lint-ignore no-explicit-any
  const edge = (globalThis as any).EdgeRuntime;
  if (edge?.waitUntil) {
    edge.waitUntil(work.catch((e: unknown) => console.error(`batch failed: ${e}`)));
    return new Response(JSON.stringify({ started: true, market }), { status: 202, headers: { "Content-Type": "application/json" } });
  }
  // 로컬/테스트 환경: 동기 실행
  const summary = await work;
  return new Response(JSON.stringify(summary), { status: 200, headers: { "Content-Type": "application/json" } });
}

async function runBatch(market: "KRX" | "US", today: Date, deps?: { callFn?: typeof callOpenAI }) {
  const todayStr = today.toISOString().slice(0, 10);
  const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const call = deps?.callFn ?? callOpenAI;
  const cap = parseInt(Deno.env.get("DAILY_WEBSEARCH_CAP") ?? "200", 10);
  const scanModel = Deno.env.get("OPENAI_MODEL_SCAN") ?? "gpt-5";
  const evalModel = Deno.env.get("OPENAI_MODEL_EVAL") ?? "gpt-5-mini";

  // 활성 가설 + 종목 로드
  const { data: theses, error } = await db
    .from("theses")
    .select("id, user_id, buy_reason, break_conditions, add_conditions, holdings!inner(id, ticker, market, name)")
    .neq("status", "closed")
    .eq("holdings.market", market);
  if (error) throw new Error(error.message);

  // Stage 1: distinct 종목 스캔 (디둡)
  const rows = (theses ?? []) as unknown as ThesisRow[];
  const byTicker = new Map<string, { ticker: string; name: string; theses: ThesisRow[] }>();
  for (const t of rows) {
    const h = t.holdings;
    if (!byTicker.has(h.ticker)) byTicker.set(h.ticker, { ticker: h.ticker, name: h.name, theses: [] });
    byTicker.get(h.ticker)!.theses.push(t);
  }

  let scanned = 0, evaluated = 0, skipped = 0, notified = 0, macroFetched = 0;
  try {
    macroFetched = await ensureMacroEvents(db, call, scanModel, todayStr);
  } catch (e) {
    console.error(`macro events fetch failed: ${e}`); // 매크로 실패해도 종목 점검은 진행
  }
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
          .insert({ ticker, market, scan_date: todayStr, summary: stripLinks(parsed.summary), change_level: parsed.change_level, sources: parsed.sources })
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
        let addSignal = false;
        if (decideEval(scan) === "eval") {
          const { data: conds } = await db.from("check_conditions").select("id, label").eq("thesis_id", t.id).eq("status", "open");
          const watchLabels = (conds ?? []).map((c: { label: string }) => c.label);
          const raw = await call({ model: evalModel, input: buildEvalPrompt({ buy_reason: t.buy_reason, break_conditions: t.break_conditions, add_conditions: t.add_conditions, summary: scan.summary, today: todayStr, watch_labels: watchLabels }), maxOutputTokens: 2000, reasoningEffort: 'low' });
          const ev = parseJsonBlock<EvalJson>(raw);
          opinion = ev.opinion; rationale = stripLinks(ev.rationale); addSignal = ev.add_signal === true; evaluated++; evalCalls++;
          // 감시 항목 깨짐 상태 반영
          const broken = new Set((ev.broken_labels ?? []).map((l) => l.trim()));
          for (const c of (conds ?? []) as Array<{ id: string; label: string }>) {
            if (broken.has(c.label.trim())) {
              await db.from("check_conditions").update({ condition_state: "broken" }).eq("id", c.id);
            }
          }
          await db.from("usage_daily").update({ eval_calls: evalCalls }).eq("usage_date", todayStr);
        } else { skipped++; }

        await db.from("check_results").insert({ thesis_id: t.id, check_date: todayStr, opinion, rationale, scan_ref: scan.id, add_signal: addSignal });
        if (opinion !== "hold" || addSignal) {
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

  const summary = { scanned, evaluated, skipped, notified, macroFetched };
  console.log(`batch done (${market}): ${JSON.stringify(summary)}`);
  return summary;
}

if (import.meta.main) Deno.serve((req) => handleBatch(req));
