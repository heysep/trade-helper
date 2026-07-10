import { assertEquals } from "jsr:@std/assert";
import { shouldRunToday, decideEval, buildScanPrompt, buildEvalPrompt, buildCuratePrompt, buildKoreaMacroPrompt } from "../daily-batch/index.ts";

Deno.test("skips weekends", () => {
  assertEquals(shouldRunToday(new Date("2026-07-11T00:00:00Z")), false); // Sat
  assertEquals(shouldRunToday(new Date("2026-07-12T00:00:00Z")), false); // Sun
  assertEquals(shouldRunToday(new Date("2026-07-09T00:00:00Z")), true);  // Thu
});

Deno.test("stage2 skipped when no change", () => {
  assertEquals(decideEval({ change_level: "none" }), "skip");
  assertEquals(decideEval({ change_level: "minor" }), "eval");
  assertEquals(decideEval({ change_level: "major" }), "eval");
});

Deno.test("prompts carry contract", () => {
  const scan = buildScanPrompt({ ticker: "NVDA", market: "US", name: "엔비디아", today: "2026-07-09" });
  assertEquals(scan.includes("change_level"), true);
  assertEquals(scan.includes("NVDA"), true);
  const ev = buildEvalPrompt({
    buy_reason: "AI 인프라", break_conditions: "CAPEX 하향", summary: "가이던스 하향 발표", today: "2026-07-09",
  });
  assertEquals(ev.includes("hold|watch|reduce|exit"), true);
  assertEquals(ev.includes("가이던스 하향 발표"), true);
});

Deno.test("curate prompt embeds feed rows and only-select rule", () => {
  const p = buildCuratePrompt([{ title: "CPI m/m", country: "USD", date: "2026-07-14T08:30:00-04:00", impact: "High" }]);
  assertEquals(p.includes("2026-07-14|USD|High|CPI m/m"), true);
  assertEquals(p.includes("지어내지 마라"), true);
});

Deno.test("korea macro prompt scoped to KR", () => {
  const p = buildKoreaMacroPrompt("2026-07-10");
  assertEquals(p.includes("한국"), true);
  assertEquals(p.includes('"region":"KR"'), true);
});
