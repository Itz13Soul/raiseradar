import Link from "next/link";
import { z } from "zod";
import { llmJson } from "../../lib/llm";
import { supabaseAnon } from "../../lib/supabase";
import { daysAgoIso, type DealRow } from "../../lib/schema";

export const revalidate = 3600;

function tally(values: (string | null)[]): [string, number][] {
  const m = new Map<string, number>();
  for (const v of values) if (v) m.set(v, (m.get(v) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
}

export default async function Brief() {
  const db = supabaseAnon();
  const since = daysAgoIso(7);
  let deals: DealRow[] = [];
  if (db) {
    const { data } = await db.from("deals").select("*").gte("created_at", since).eq("is_sample", false).limit(500);
    deals = (data ?? []) as DealRow[];
  }
  const stats = {
    deals_added_last_7_days: deals.length,
    top_stages: tally(deals.map((d) => d.stage)),
    top_sectors: tally(deals.map((d) => d.sector)),
    top_cities: tally(deals.map((d) => d.city)),
    top_predicted_roles: tally(deals.flatMap((d) => d.hiring?.roles?.map((r) => r.role) ?? [])),
  };

  let summary: string | null = null;
  if (deals.length > 0) {
    try {
      const out = await llmJson(z.object({ summary: z.string() }), {
        system:
          'Write a 3-sentence weekly brief for job seekers and sales teams from the stats JSON. Use ONLY numbers and names present in the stats. Do not add figures. Return JSON: {"summary": string}.',
        user: JSON.stringify(stats),
      });
      summary = out.summary;
    } catch {
      summary = null;
    }
  }

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8">
      <Link href="/" className="text-sm underline">
        Back to deals
      </Link>
      <h1 className="mt-2 text-2xl font-semibold">Weekly brief</h1>
      <p className="text-sm text-zinc-400">Covers deals added in the last 7 days. Sample rows are excluded.</p>
      {deals.length === 0 ? (
        <p className="mt-4">No deals were added in the last 7 days.</p>
      ) : (
        <>
          {summary && <p className="mt-4">{summary}</p>}
          <dl className="mt-4 space-y-2 text-sm">
            <div>
              <dt className="font-semibold">Deals added</dt>
              <dd>{stats.deals_added_last_7_days}</dd>
            </div>
            {(
              [
                ["Top stages", stats.top_stages],
                ["Top sectors", stats.top_sectors],
                ["Top cities", stats.top_cities],
                ["Most predicted roles", stats.top_predicted_roles],
              ] as [string, [string, number][]][]
            ).map(([label, rows]) => (
              <div key={label}>
                <dt className="font-semibold">{label}</dt>
                <dd>{rows.map(([k, n]) => `${k} (${n})`).join(", ") || "n/a"}</dd>
              </div>
            ))}
          </dl>
        </>
      )}
    </main>
  );
}
