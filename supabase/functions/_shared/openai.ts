export interface CallOpts {
  model: string; input: string; webSearch?: boolean; maxOutputTokens?: number; fetchFn?: typeof fetch;
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
    max_output_tokens: opts.maxOutputTokens ?? 1200,
  };
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

export function parseJsonBlock<T>(raw: string): T {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced ? fenced[1] : raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1);
  return JSON.parse(candidate) as T;
}
