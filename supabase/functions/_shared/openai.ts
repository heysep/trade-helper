export interface CallOpts {
  model: string; input: string; webSearch?: boolean; maxOutputTokens?: number;
  reasoningEffort?: 'low' | 'medium' | 'high'; fetchFn?: typeof fetch;
}

interface ResponsesOutput {
  output_text?: string;
  output?: Array<{ type: string; content?: Array<{ type: string; text?: string }> }>;
}

export async function callOpenAI(opts: CallOpts): Promise<string> {
  const key = Deno.env.get("OPENAI_API_KEY");
  if (!key) throw new Error("OPENAI_API_KEY missing");
  const f = opts.fetchFn ?? fetch;
  const body: Record<string, unknown> = {
    model: opts.model,
    input: opts.input,
    // reasoning 모델은 reasoning 토큰도 이 한도에 포함 — 넉넉히
    max_output_tokens: opts.maxOutputTokens ?? 4000,
  };
  if (opts.reasoningEffort) body.reasoning = { effort: opts.reasoningEffort };
  if (opts.webSearch) body.tools = [{ type: "web_search" }];
  const res = await f("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as ResponsesOutput;
  if (data.output_text) return data.output_text;
  const text = (data.output ?? [])
    .flatMap((o) => o.content ?? [])
    .filter((c) => c.type === "output_text" && c.text)
    .map((c) => c.text).join("");
  if (!text) throw new Error("OpenAI: empty output");
  return text;
}

/**
 * web_search가 자동 주입하는 인용/링크 제거 (프롬프트 지시만으론 못 막음).
 * "([trendforce.com](https://...))" 패턴, 마크다운 링크, 맨몸 URL 순으로 제거.
 */
export function stripLinks(s: string): string {
  return s
    .replace(/\s*\(\[[^\]]*\]\([^)]*\)\)/g, "")     // ([site.com](url)) 통째 제거
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")          // [text](url) → text
    .replace(/\s*\(?https?:\/\/[^\s)]+\)?/g, "")      // 맨몸 URL
    .replace(/ {2,}/g, " ")
    .trim();
}

export function parseJsonBlock<T>(raw: string): T {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  return JSON.parse(candidate) as T;
}
