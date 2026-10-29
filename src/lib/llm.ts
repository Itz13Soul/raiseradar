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
  for (let attempt = 0; attempt < 3; attempt++) {
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
    await sleep(600 * (attempt + 1));
  }
  throw lastErr;
}

function thinking(model: string): Record<string, unknown> {
  if (/2\.5-flash/.test(model)) return { thinkingConfig: { thinkingBudget: 0 } };
  if (/2\.5-pro/.test(model)) return { thinkingConfig: { thinkingBudget: 128 } };
  if (/gemini-3/.test(model)) return { thinkingConfig: { thinkingLevel: "low" } };
  return {};
}

const HEDGE_MS = Number(process.env.GEMINI_HEDGE_MS ?? 1500);

class HttpError extends Error {
  constructor(public status: number, text: string) {
    super(`LLM HTTP ${status}: ${text.slice(0, 300)}`);
  }
}

async function geminiAttempt(model: string, key: string, body: unknown, signal: AbortSignal): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: { "content-type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify(body),
          signal,
        },
      );
      if (!res.ok) throw new HttpError(res.status, await res.text());
      const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[] };
      const text = data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("");
      if (!text) throw new Error("Gemini returned no text");
      return text;
    } catch (e) {
      if (signal.aborted) throw e;
      const retriable = !(e instanceof HttpError) || e.status === 429 || e.status >= 500;
      if (!retriable || attempt === 2) throw e;
      await sleep(400 * (attempt + 1));
    }
  }
  throw new Error("unreachable");
}

async function raceGemini(models: string[], key: string, bodyFor: (model: string) => unknown): Promise<string> {
  const total = AbortSignal.timeout(BUDGET_MS);
  const ctrls = models.map(() => new AbortController());
  return new Promise<string>((resolve, reject) => {
    const started: boolean[] = models.map(() => false);
    const errors: unknown[] = [];
    let finished = false;
    let hedge: ReturnType<typeof setTimeout> | undefined;
    const finish = (fn: () => void) => {
      if (finished) return;
      finished = true;
      if (hedge) clearTimeout(hedge);
      ctrls.forEach((c) => c.abort());
      fn();
    };
    const start = (i: number) => {
      if (i >= models.length || started[i] || finished) return;
      started[i] = true;
      geminiAttempt(models[i], key, bodyFor(models[i]), AbortSignal.any([ctrls[i].signal, total]))
        .then((text) => finish(() => resolve(text)))
        .catch((e) => {
          if (finished) return;
          errors.push(e);
          if (total.aborted) return finish(() => reject(new Error("LLM timeout: time budget exhausted")));
          const next = started.findIndex((s) => !s);
          if (next >= 0) start(next);
          else if (errors.length >= models.length) finish(() => reject(errors[0]));
        });
    };
    total.addEventListener("abort", () => finish(() => reject(errors[0] ?? new Error("LLM timeout: time budget exhausted"))));
    start(0);
    if (models.length > 1) hedge = setTimeout(() => start(1), HEDGE_MS);
  });
}

function geminiModels(): string[] {
  const primary = requireEnv("GEMINI_MODEL");
  const fallback = process.env.GEMINI_FALLBACK_MODEL?.trim();
  return fallback && fallback !== primary ? [primary, fallback] : [primary];
}

async function callGemini({ system, user }: Req): Promise<string> {
  return raceGemini(geminiModels(), requireEnv("GEMINI_API_KEY"), (model) => ({
    systemInstruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: { responseMimeType: "application/json", temperature: 0, ...thinking(model) },
  }));
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

const CACHE_TTL_MS = 10 * 60 * 1000;
const CACHE_MAX = 200;
const cache = new Map<string, { at: number; value: unknown }>();

function cacheKey(req: Req): string {
  return `${process.env.LLM_PROVIDER ?? "gemini"}|${process.env.GEMINI_MODEL ?? ""}|${req.system}|${req.user}`;
}

export async function llmJson<T>(schema: z.ZodType<T>, req: Req): Promise<T> {
  const key = cacheKey(req);
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.value as T;
  deadline = Date.now() + BUDGET_MS;
  const provider = (process.env.LLM_PROVIDER ?? "gemini").toLowerCase();
  const call = provider === "anthropic" ? callAnthropic : callGemini;
  let lastErr: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await call(req);
    try {
      const value = schema.parse(JSON.parse(stripFences(raw)));
      if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string);
      cache.set(key, { at: Date.now(), value });
      return value;
    } catch (e) {
      lastErr = e;
    }
  }
  throw new Error(`LLM output failed schema validation twice: ${String(lastErr).slice(0, 300)}`);
}
