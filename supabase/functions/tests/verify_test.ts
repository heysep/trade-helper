import { assertEquals } from "jsr:@std/assert";
import { buildVerifyPrompt } from "../gpt-verify/index.ts";

Deno.test("verify prompt contains thesis fields and JSON contract, no advice tone", () => {
  const p = buildVerifyPrompt({
    name: "엔비디아", ticker: "NVDA", market: "US",
    buy_reason: "AI 인프라 증가", break_conditions: "CAPEX 하향", target_horizon: "2년", today: "2026-07-09",
  });
  for (const s of ["엔비디아", "US:NVDA", "AI 인프라 증가", "CAPEX 하향", "check_conditions", "next_check_date", "reason_reviews", "verdict"]) {
    assertEquals(p.includes(s), true, `missing: ${s}`);
  }
  assertEquals(p.includes("매수/매도하세요"), true); // 금지 지시 명시 확인
});
