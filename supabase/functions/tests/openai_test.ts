import { assertEquals, assertRejects } from "jsr:@std/assert";
import { callOpenAI, parseJsonBlock, stripLinks } from "../_shared/openai.ts";

Deno.test("callOpenAI posts to responses API and returns output_text", async () => {
  let captured: { url: string; body: Record<string, unknown> } | null = null;
  const fetchFn = ((url: string, init: RequestInit) => {
    captured = { url, body: JSON.parse(init.body as string) };
    return Promise.resolve(new Response(JSON.stringify({ output_text: "hello" }), { status: 200 }));
  }) as unknown as typeof fetch;

  Deno.env.set("OPENAI_API_KEY", "test-key");
  const out = await callOpenAI({ model: "gpt-5-mini", input: "hi", webSearch: true, fetchFn });
  assertEquals(out, "hello");
  assertEquals(captured!.url, "https://api.openai.com/v1/responses");
  assertEquals(captured!.body.model, "gpt-5-mini");
  assertEquals((captured!.body.tools as Array<{ type: string }>)[0].type, "web_search");
});

Deno.test("callOpenAI throws on non-200", async () => {
  const fetchFn = (() => Promise.resolve(new Response("rate limited", { status: 429 }))) as unknown as typeof fetch;
  Deno.env.set("OPENAI_API_KEY", "test-key");
  await assertRejects(() => callOpenAI({ model: "m", input: "x", fetchFn }), Error, "OpenAI 429");
});

Deno.test("parseJsonBlock handles fenced and plain JSON", () => {
  assertEquals(parseJsonBlock<{ a: number }>('```json\n{"a":1}\n```').a, 1);
  assertEquals(parseJsonBlock<{ a: number }>('전문: {"a":2} 끝').a, 2);
});

Deno.test("stripLinks removes citations, markdown links, bare urls", () => {
  assertEquals(stripLinks("HBM은 타이트하다. ([trendforce.com](https://x.com/a?utm=1))"), "HBM은 타이트하다.");
  assertEquals(stripLinks("자세한 건 [여기](https://a.b) 참고"), "자세한 건 여기 참고");
  assertEquals(stripLinks("출처: https://ex.com/path 끝"), "출처: 끝");
});
