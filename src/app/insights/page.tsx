import { supabaseAnon } from "../../lib/supabase";
import type { DealRow } from "../../lib/schema";

export const revalidate = 600;

function tally(values: (string | null | undefined)[], top = 8): [string, number][] {
  const m = new Map<string, number>();
  for (const v of values) if (v) m.set(v, (m.get(v) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, top);
}

function Bars({ title, data }: { title: string; data: [string, number][] }) {
  const max = Math.max(1, ...data.map(([, n]) => n));
  return (
    <section className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">{title}</h2>
      {data.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">No data yet.</p>
      ) : (
        <ul className="mt-3 space-y-2">
          {data.map(([label, n]) => (
            <li key={label} className="text-sm">
              <div className="flex justify-between">
                <span>{label}</span>
                <span className="tabular-nums text-zinc-400">{n}</span>
              </div>
              <div className="mt-1 h-2 rounded-full bg-white/10">
                <div className="h-2 rounded-full bg-cyan-400" style={{ width: `${(n / max) * 100}%` }} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default async function Insights() {
  const db = supabaseAnon();
  let deals: DealRow[] = [];
  if (db) {
    const { data } = await db.from("deals").select("*").limit(1000);
    deals = (data ?? []) as DealRow[];
  }
  const real = deals.filter((d) => !d.is_sample);
  const sampleOnly = real.length === 0 && deals.length > 0;
  const rows = sampleOnly ? deals : real;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-10">
      <h1 className="text-3xl font-semibold tracking-tight">Market insights</h1>
      <p className="mt-2 text-zinc-400">
        Counts of the deals tracked here ({rows.length}). This is a curated set, not the whole Indian market.
      </p>
      {sampleOnly && <p className="mt-3 rounded-lg bg-violet-400/10 p-3 text-sm text-violet-200">Showing sample data only.</p>}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Bars title="Deals by stage" data={tally(rows.map((d) => d.stage))} />
        <Bars title="Deals by city" data={tally(rows.map((d) => d.city))} />
        <Bars title="Deals by sector" data={tally(rows.map((d) => d.sector))} />
        <Bars title="Most predicted roles" data={tally(rows.flatMap((d) => d.hiring?.roles.map((r) => r.role) ?? []))} />
      </div>
    </main>
  );
}
