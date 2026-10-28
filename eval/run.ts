import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { extractDeal } from "../src/lib/extract";

type Labelled = {
  title: string;
  snippet: string;
  publishedAt?: string;
  source_url: string;
  expected: {
    is_funding_round: boolean;
    company: string | null;
    amount_value: number | null;
    stage: string | null;
    city: string | null;
    announced_date: string | null;
  };
};

const FIELDS = ["is_funding_round", "company", "amount_value", "stage", "city", "announced_date"] as const;
const MIN_ITEMS = 50;

const norm = (s: unknown) => String(s ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
function same(field: (typeof FIELDS)[number], a: unknown, b: unknown): boolean {
  if (field === "amount_value") {
    if (a == null || b == null) return a == null && b == null;
    return Math.abs(Number(a) - Number(b)) <= Math.abs(Number(b)) * 0.01;
  }
  if (field === "is_funding_round") return a === b;
  return norm(a) === norm(b);
}

async function main() {
  const path = "eval/labelled.json";
  if (!existsSync(path)) {
    console.error(`Missing ${path}. Copy eval/labelled.template.json, then label at least ${MIN_ITEMS} real deals by hand.`);
    process.exit(1);
  }
  const items: Labelled[] = JSON.parse(readFileSync(path, "utf8"));
  if (items.length < MIN_ITEMS) {
    console.error(`Only ${items.length} labelled items. Need at least ${MIN_ITEMS} before a score is meaningful.`);
    process.exit(1);
  }

  const hits: Record<string, number> = Object.fromEntries(FIELDS.map((f) => [f, 0]));
  let allCorrect = 0;
  const failures: unknown[] = [];

  for (const [i, it] of items.entries()) {
    try {
      const got = await extractDeal({ title: it.title, snippet: it.snippet, publishedAt: it.publishedAt });
      let ok = true;
      for (const f of FIELDS) {
        if (same(f, got[f], it.expected[f])) hits[f]++;
        else {
          ok = false;
          failures.push({ index: i, field: f, expected: it.expected[f], got: got[f], source: it.source_url });
        }
      }
      if (ok) allCorrect++;
    } catch (e) {
      failures.push({ index: i, error: String(e), source: it.source_url });
    }
    console.log(`${i + 1}/${items.length}`);
  }

  const n = items.length;
  const result = {
    run_at: new Date().toISOString(),
    n,
    per_field_accuracy: Object.fromEntries(FIELDS.map((f) => [f, +(hits[f] / n).toFixed(4)])),
    all_fields_correct: +(allCorrect / n).toFixed(4),
    failures,
  };
  writeFileSync("eval/results.json", JSON.stringify(result, null, 2));
  console.log(JSON.stringify({ ...result, failures: `${failures.length} (see eval/results.json)` }, null, 2));
}

main();
