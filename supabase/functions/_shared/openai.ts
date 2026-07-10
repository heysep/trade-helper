/**
 * 전 프롬프트 공통 출력 규칙 — JSON 파싱 안정성 + 한국어 텍스트 위생.
 * 각 프롬프트 끝부분에 붙여 쓴다. (예외: buildScanPrompt는 sources에 URL을 담아야 해서 자체 규칙 사용)
 */
export const OUTPUT_RULES = `공통 출력 규칙:
- 설명·인사말·코드펜스 없이 JSON 객체 하나만 출력하라. { 로 시작해 } 로 끝내고, 반드시 완전하고 유효한 JSON이어야 한다.
- enum 필드는 제시된 값 중 하나를 글자 그대로 써라. 다른 값 금지.
- 서술 필드는 쉬운 일상어 한국어로. 어려운 용어는 바로 뒤에 짧게 풀어써라. 예: "포워드 PER(내년 이익 대비 주가 배수)".
- 서술 필드에 URL·마크다운·괄호 출처표기 금지. 문장은 짧고 완결되게, 중간에 끊지 마라.`;

/** 자문 아님 고지 — 사용자 응대형 프롬프트(verify/revise/suggest/eval) 공통 */
export const NO_ADVICE_RULE = `자문·추천이 아니다. "매수/매도하세요" 같은 직접 권유 표현 금지.`;

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
