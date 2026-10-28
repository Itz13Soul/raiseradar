import type { Extraction } from "./schema";

export const ACCURACY_FIELDS = ["company", "amount_value", "stage", "city", "announced_date"] as const;
export type AccuracyField = (typeof ACCURACY_FIELDS)[number];

type Reviewed = {
  raw_extraction: Extraction | null;
  company: string;
  amount_value: number | null;
  stage: string | null;
  city: string | null;
  announced_date: string | null;
};

const norm = (v: unknown) => String(v ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

function agree(field: AccuracyField, raw: unknown, final: unknown): boolean {
  if (field === "amount_value") {
    if (raw == null || final == null) return raw == null && final == null;
    return Math.abs(Number(raw) - Number(final)) <= Math.abs(Number(final)) * 0.01;
  }
  return norm(raw) === norm(final);
}

export function measureAccuracy(rows: Reviewed[]) {
  const usable = rows.filter((r) => r.raw_extraction);
  const n = usable.length;
  const hits = Object.fromEntries(ACCURACY_FIELDS.map((f) => [f, 0])) as Record<AccuracyField, number>;
  let allCorrect = 0;
  for (const r of usable) {
    let ok = true;
    for (const f of ACCURACY_FIELDS) {
      if (agree(f, r.raw_extraction?.[f], r[f])) hits[f]++;
      else ok = false;
    }
    if (ok) allCorrect++;
  }
  return {
    n,
    perField: Object.fromEntries(ACCURACY_FIELDS.map((f) => [f, n ? hits[f] / n : null])) as Record<
      AccuracyField,
      number | null
    >,
    allCorrect: n ? allCorrect / n : null,
  };
}
