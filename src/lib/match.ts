import type { Audience } from "./profile";

export type MatchProfile = {
  audience: Audience;
  roles: string[];
  skills: string[];
  cities: string[];
  sectors: string[];
  stages: string[];
};

export type MatchDeal = {
  company: string;
  amount_value: number | null;
  currency: string | null;
  stage: string | null;
  sector: string | null;
  city: string | null;
  announced_date: string | null;
  use_of_funds: string | null;
  hiring: { roles: { role: string; reason: string; confidence: "low" | "medium" | "high" }[] } | null;
};

export type MatchResult = { score: number; reasons: string[] };

const STOP = new Set(["and", "the", "of", "for", "to", "in", "a", "an", "with", "on", "at", "by", "or", "team", "expansion", "new", "senior", "junior", "lead", "head"]);

// Light, consistent stemming so "engineering", "engineer" and "engineers" all become "engin".
const SUFFIXES = ["ing", "ers", "er", "ions", "ion", "ed", "es", "s", "e"];
function stem(w: string): string {
  if (w.endsWith("ies") && w.length > 4) return w.slice(0, -3) + "y";
  for (let i = 0; i < 3; i++) {
    for (const suf of SUFFIXES) {
      if (w.endsWith(suf) && w.length - suf.length >= 3) {
        w = w.slice(0, -suf.length);
        break;
      }
    }
  }
  return w;
}

export function tokens(text: string): Set<string> {
  const out = new Set<string>();
  for (const raw of text.toLowerCase().split(/[^a-z0-9+#]+/)) {
    if (raw.length < 2 || STOP.has(raw)) continue;
    out.add(stem(raw));
  }
  return out;
}

// Share of the profile's phrases that appear (by token overlap) in the haystack tokens.
// A phrase counts as matched when at least half of its tokens are present.
function phraseCoverage(phrases: string[], hay: Set<string>): { frac: number; hits: string[] } {
  const hits: string[] = [];
  for (const p of phrases) {
    const t = [...tokens(p)];
    if (t.length === 0) continue;
    const found = t.filter((x) => hay.has(x)).length;
    if (found / t.length >= 0.5) hits.push(p);
  }
  return { frac: phrases.length ? hits.length / phrases.length : 0, hits };
}

const CONF: Record<string, number> = { high: 1, medium: 0.75, low: 0.5 };

function roleScore(profile: MatchProfile, deal: MatchDeal): { v: number; reason?: string } {
  const roles = deal.hiring?.roles ?? [];
  let best = 0;
  let bestRole = "";
  for (const want of profile.roles) {
    const w = tokens(want);
    if (w.size === 0) continue;
    for (const r of roles) {
      const rt = tokens(r.role);
      const found = [...w].filter((x) => rt.has(x)).length;
      const cov = found / w.size;
      if (cov < 0.5) continue;
      const s = cov * CONF[r.confidence];
      if (s > best) {
        best = s;
        bestRole = `${r.role} (${r.confidence} confidence)`;
      }
    }
  }
  return best > 0 ? { v: best, reason: `Predicted role match: ${bestRole}` } : { v: 0 };
}

function listMatch(wanted: string[], value: string | null): boolean {
  if (!value) return false;
  const v = value.toLowerCase();
  const vt = tokens(value);
  return wanted.some((w) => {
    const wl = w.toLowerCase();
    if (v.includes(wl) || wl.includes(v)) return true;
    const wt = [...tokens(w)];
    return wt.length > 0 && wt.every((x) => vt.has(x));
  });
}

export function recencyScore(announced: string | null, now = Date.now()): number {
  if (!announced) return 0.2;
  const t = Date.parse(announced);
  if (Number.isNaN(t)) return 0.2;
  const days = Math.max(0, (now - t) / 86400_000);
  if (days <= 14) return 1;
  if (days <= 30) return 0.8;
  if (days <= 60) return 0.5;
  if (days <= 120) return 0.3;
  return 0.15;
}

// Round size in USD millions (INR crore ~ 1 USD million / 8.3 at a rough fixed rate; only used to rank size bands).
function usdMillions(d: MatchDeal): number | null {
  if (d.amount_value == null) return null;
  if (d.currency === "USD") return d.amount_value / 1e6;
  if (d.currency === "INR") return d.amount_value / 1e6 / 83;
  return null;
}

function sizeScore(d: MatchDeal): number {
  const m = usdMillions(d);
  if (m == null) return 0.3;
  if (m >= 20) return 1;
  if (m >= 5) return 0.8;
  if (m >= 1) return 0.55;
  return 0.3;
}

type Weights = { role: number; skills: number; sector: number; stage: number; city: number; size: number };

const WEIGHTS: Record<Audience, Weights> = {
  job_seeker: { role: 40, skills: 15, sector: 10, stage: 10, city: 15, size: 0 },
  recruiter: { role: 45, skills: 15, sector: 10, stage: 10, city: 5, size: 5 },
  sales: { role: 0, skills: 35, sector: 20, stage: 15, city: 5, size: 15 },
};
const RECENCY_WEIGHT = 10;

export function scoreDeal(profile: MatchProfile, deal: MatchDeal, now = Date.now()): MatchResult {
  const w = WEIGHTS[profile.audience];
  const reasons: string[] = [];
  const parts: { weight: number; v: number }[] = [];

  const add = (weight: number, active: boolean, v: number, reason?: string) => {
    if (weight <= 0 || !active) return;
    parts.push({ weight, v });
    if (v > 0 && reason) reasons.push(reason);
  };

  const hay = tokens(
    [deal.use_of_funds ?? "", deal.sector ?? "", ...(deal.hiring?.roles ?? []).flatMap((r) => [r.role, r.reason])].join(" "),
  );

  if (w.role > 0 && profile.roles.length > 0) {
    const r = roleScore(profile, deal);
    add(w.role, true, r.v, r.reason);
  }
  if (w.skills > 0 && profile.skills.length > 0) {
    const c = phraseCoverage(profile.skills, hay);
    add(w.skills, true, c.frac, c.hits.length ? `Mentioned in use of funds or predicted roles: ${c.hits.slice(0, 3).join(", ")}` : undefined);
  }
  if (w.sector > 0 && profile.sectors.length > 0) {
    const ok = listMatch(profile.sectors, deal.sector);
    add(w.sector, true, ok ? 1 : 0, ok ? `Sector: ${deal.sector}` : undefined);
  }
  if (w.stage > 0 && profile.stages.length > 0) {
    const ok = !!deal.stage && profile.stages.some((s) => s.toLowerCase() === deal.stage!.toLowerCase());
    add(w.stage, true, ok ? 1 : 0, ok ? `Stage: ${deal.stage}` : undefined);
  }
  if (w.city > 0 && profile.cities.length > 0) {
    const ok = listMatch(profile.cities, deal.city);
    add(w.city, true, ok ? 1 : 0, ok ? `City: ${deal.city}` : undefined);
  }
  if (w.size > 0) {
    const v = sizeScore(deal);
    add(w.size, true, v, v >= 0.8 ? "Larger round, more budget to spend" : undefined);
  }

  const rec = recencyScore(deal.announced_date, now);
  const specified = parts.reduce((a, p) => a + p.weight, 0);
  // Preference dimensions share the remaining weight after recency, so an unfilled field never counts against a deal.
  const prefShare = 100 - RECENCY_WEIGHT;
  let total = 0;
  if (specified > 0) {
    for (const p of parts) total += (p.weight / specified) * p.v * prefShare;
  }
  total += rec * RECENCY_WEIGHT;
  if (rec >= 0.8) reasons.push("Announced in the last 30 days");

  return { score: Math.round(Math.max(0, Math.min(100, total))), reasons };
}

export function rankDeals<T extends MatchDeal>(profile: MatchProfile, deals: T[], now = Date.now()): (T & MatchResult)[] {
  return deals
    .map((d) => ({ ...d, ...scoreDeal(profile, d, now) }))
    .sort((a, b) => b.score - a.score);
}

export function profileIsEmpty(p: MatchProfile): boolean {
  return p.roles.length + p.skills.length + p.sectors.length + p.stages.length + p.cities.length === 0;
}
