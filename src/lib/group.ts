import { slugify } from "./seo";
import type { DealRow } from "./schema";

export type Group = { slug: string; label: string; deals: DealRow[] };

// Pages with fewer deals than this are thin content, so they are neither built nor listed in the sitemap.
export const MIN_GROUP = 3;

export function groupDeals(deals: DealRow[], field: "city" | "sector"): Group[] {
  const map = new Map<string, { variants: Map<string, number>; deals: DealRow[] }>();
  for (const d of deals) {
    const raw = d[field]?.trim();
    if (!raw) continue;
    const slug = slugify(raw);
    if (!slug) continue;
    const e = map.get(slug) ?? { variants: new Map<string, number>(), deals: [] as DealRow[] };
    e.variants.set(raw, (e.variants.get(raw) ?? 0) + 1);
    e.deals.push(d);
    map.set(slug, e);
  }
  const out: Group[] = [];
  for (const [slug, e] of map) {
    if (e.deals.length < MIN_GROUP) continue;
    const best = [...e.variants.entries()].sort((a, b) => b[1] - a[1])[0][0];
    out.push({ slug, label: best.charAt(0).toUpperCase() + best.slice(1), deals: e.deals });
  }
  return out.sort((a, b) => b.deals.length - a.deals.length || a.label.localeCompare(b.label));
}
