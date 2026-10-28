import { z } from "zod";

type Req = { system: string; user: string };

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
}

function stripFences(s: string): string {
  return s
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/, "")
    .trim();
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

type JsonBody = Record<string, unknown>;

const BUDGET_MS = 50000;
let deadline = 0;

async function postJson(url: string, headers: Record<string, string>, body: unknown): Promise<JsonBody> {
  let lastErr: unknown = new Error("LLM time budget exhausted before a request could start");
  for (let attempt = 0; attempt < 4; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining < 4000) break;
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(Math.min(20000, remaining)),
      });
      if (res.ok) return res.json();
      const text = await res.text();
      lastErr = new Error(`LLM HTTP ${res.status}: ${text.slice(0, 300)}`);
      if (res.status !== 429 && res.status < 500) throw lastErr;
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("LLM HTTP 4")) throw e;
      lastErr = e;
    }
    await sleep(1500 * (attempt + 1));
  }
  throw lastErr;
}

async function callGemini({ system, user }: Req): Promise<string> {
  const key = requireEnv("GEMINI_API_KEY");
  const primary = requireEnv("GEMINI_MODEL");
  const fallback = process.env.GEMINI_FALLBACK_MODEL?.trim();
  const models = fallback && fallback !== primary ? [primary, fallback] : [primary];
  let lastErr: unknown;
  const overall = deadline;
  for (let i = 0; i < models.length; i++) {
    const model = models[i];
    deadline = i === models.length - 1 ? overall : Date.now() + Math.floor((overall - Date.now()) / 2);
    try {
      const data = await postJson(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        { "x-goog-api-key": key },
        {
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: "user", parts: [{ text: user }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0 },
        },
      );
      const candidates = data.candidates as { content?: { parts?: { text?: string }[] } }[] | undefined;
      const text = candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("");
      if (!text) throw new Error("Gemini returned no text");
      return text;
    } catch (e) {
      lastErr = lastErr && String(e).includes("budget exhausted") ? lastErr : e;
    }
  }
  deadline = overall;
  throw lastErr;
}

async function callAnthropic({ system, user }: Req): Promise<string> {
  const key = requireEnv("ANTHROPIC_API_KEY");
  const model = requireEnv("ANTHROPIC_MODEL");
  const data = await postJson(
    "https://api.anthropic.com/v1/messages",
    { "x-api-key": key, "anthropic-version": "2023-06-01" },
    {
      model,
      max_tokens: 1500,
      temperature: 0,
      system: system + "\nReturn ONLY a JSON object. No prose, no code fences.",
      messages: [{ role: "user", content: user }],
    },
  );
  const blocks = data.content as { text?: string }[] | undefined;
  const text = blocks?.map((c) => c.text ?? "").join("");
  if (!text) throw new Error("Anthropic returned no text");
  return text;
}

export async function llmJson<T>(schema: z.ZodType<T>, req: Req): Promise<T> {
  deadline = Date.now() + BUDGET_MS;
  const provider = (process.env.LLM_PROVIDER ?? "gemini").toLowerCase();
  const call = provider === "anthropic" ? callAnthropic : callGemini;
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await call(req);
    try {
      return schema.parse(JSON.parse(stripFences(raw)));
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(`LLM output failed schema validation twice: ${String(lastErr).slice(0, 300)}`);
}
