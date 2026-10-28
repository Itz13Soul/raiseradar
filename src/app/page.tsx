import Link from "next/link";
import GlobeLoader from "../components/GlobeLoader";
import CopyButton from "../components/CopyButton";
import { supabaseAnon } from "../lib/supabase";
import { founderSearchUrl } from "../lib/signals";
import { STAGES, isHttpUrl, type DealRow } from "../lib/schema";

export const revalidate = 300;

type Params = { city?: string; sector?: string; stage?: string; role?: string };

const CONFIDENCE: Record<string, string> = {
  high: "bg-emerald-400",
  medium: "bg-amber-400",
  low: "bg-zinc-500",
};

function money(d: DealRow): string {
  if (d.amount_raw) return d.amount_raw;
  if (d.amount_value == null) return "Undisclosed";
  return `${d.currency ?? ""} ${d.amount_value.toLocaleString("en-IN")}`.trim();
}

export default async function Home({ searchParams }: PageProps<"/">) {
  const raw = await searchParams;
  const pick = (k: string) => {
    const v = raw[k];
    return (Array.isArray(v) ? v[0] : v)?.trim().slice(0, 60) || undefined;
  };
  const sp: Params = { city: pick("city"), sector: pick("sector"), stage: pick("stage"), role: pick("role") };
  const db = supabaseAnon();
  let deals: DealRow[] = [];
  let loadError: string | null = null;

  if (!db) {
    loadError = "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.";
  } else {
    let q = db
      .from("deals")
      .select("*")
      .order("announced_date", { ascending: false, nullsFirst: false })
      .limit(200);
    if (sp.city) q = q.ilike("city", sp.city.replace(/[%_]/g, ""));
    if (sp.sector) q = q.ilike("sector", `%${sp.sector.replace(/[%_]/g, "")}%`);
    if (sp.stage) q = q.eq("stage", sp.stage);
    const { data, error } = await q;
    if (error) loadError = error.message;
    deals = (data ?? []) as DealRow[];
    if (sp.role) {
      const needle = sp.role.toLowerCase();
      deals = deals.filter((d) => d.hiring?.roles?.some((r) => r.role.toLowerCase().includes(needle)));
    }
  }

  const cities = deals.map((d) => d.city).filter((c): c is string => !!c);
  const cityCount = new Set(cities.map((c) => c.toLowerCase())).size;
  const roleCount = deals.reduce((n, d) => n + (d.hiring?.roles?.length ?? 0), 0);
  const stats: [string, number][] = [
    ["Deals shown", deals.length],
    ["Cities", cityCount],
    ["Predicted roles", roleCount],
  ];

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-10 pt-8">
      <nav className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2 font-semibold tracking-tight">
          <span className="relative inline-block h-5 w-5 overflow-hidden rounded-full border border-cyan-400/60">
            <span className="sweep absolute inset-0" />
          </span>
          RaiseRadar
        </span>
        <Link href="/brief" className="rounded-full border border-white/15 px-3 py-1 text-zinc-300 transition hover:border-cyan-400/60 hover:text-cyan-200">
          Weekly brief
        </Link>
      </nav>

      <section className="mt-6 grid items-center gap-6 md:grid-cols-2">
        <div className="rise">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-cyan-300">India funding intelligence</p>
          <h1 className="mt-3 text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Every funding round, turned into a hiring signal.
          </h1>
          <p className="mt-4 max-w-md text-zinc-400">
            See which roles a freshly funded startup is likely to open, why, and a three-line note to reach the founder.
          </p>
          <dl className="mt-6 grid max-w-md grid-cols-3 gap-3">
            {stats.map(([label, value]) => (
              <div key={label} className="rounded-xl border border-white/10 bg-white/[0.04] p-3 backdrop-blur">
                <dt className="text-[11px] uppercase tracking-wide text-zinc-500">{label}</dt>
                <dd className="mt-1 text-2xl font-semibold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>
        </div>
        <div className="relative mx-auto aspect-square w-full max-w-md overflow-hidden">
          <div className="sweep absolute inset-[19%] rounded-full" />
          <div className="absolute inset-0">
            <GlobeLoader cities={cities} />
          </div>
        </div>
      </section>

      <p className="mt-6 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-100">
        Hiring signals are predictions inferred from stage, sector and stated use of funds. They are not confirmed
        openings. Verify every deal at its linked source before acting.
      </p>

      <form className="mt-6 grid grid-cols-2 gap-3 rounded-xl border border-white/10 bg-white/[0.03] p-3 backdrop-blur sm:grid-cols-5" method="get">
        <input name="city" defaultValue={sp.city} placeholder="City" className="rounded-lg border border-white/10 bg-black/30 p-2 text-sm placeholder:text-zinc-500 focus:border-cyan-400/60 focus:outline-none" />
        <input name="sector" defaultValue={sp.sector} placeholder="Sector" className="rounded-lg border border-white/10 bg-black/30 p-2 text-sm placeholder:text-zinc-500 focus:border-cyan-400/60 focus:outline-none" />
        <select name="stage" defaultValue={sp.stage ?? ""} className="rounded-lg border border-white/10 bg-black/30 p-2 text-sm focus:border-cyan-400/60 focus:outline-none">
          <option value="">Any stage</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input name="role" defaultValue={sp.role} placeholder="Role (e.g. engineering)" className="rounded-lg border border-white/10 bg-black/30 p-2 text-sm placeholder:text-zinc-500 focus:border-cyan-400/60 focus:outline-none" />
        <button className="rounded-lg bg-cyan-400 p-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-300">Filter</button>
      </form>

      {loadError && <p className="mt-4 rounded-lg bg-red-500/10 p-3 text-sm text-red-200">{loadError}</p>}
      {!loadError && deals.length === 0 && (
        <p className="mt-8 text-center text-zinc-500">No deals match yet. The daily ingest fills this list from the configured feeds.</p>
      )}

      <ul className="mt-6 space-y-4">
        {deals.map((d, idx) => (
          <li
            key={d.id}
            style={{ animationDelay: `${Math.min(idx, 8) * 60}ms` }}
            className="rise rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur transition hover:border-cyan-400/30"
          >
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold">
                {d.company}
                {d.is_sample && (
                  <span className="ml-2 rounded-full bg-violet-400/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-violet-200">
                    Sample data
                  </span>
                )}
              </h2>
              <span className="text-sm text-zinc-400">
                <span className="font-medium text-amber-300">{money(d)}</span> · {d.stage ?? "Stage n/a"} · {d.announced_date ?? "Date n/a"}
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-400">
              {[d.sector, d.city].filter(Boolean).join(" · ") || "Sector and city not stated"}
              {d.investors.length > 0 && ` · Investors: ${d.investors.join(", ")}`}
            </p>
            {d.use_of_funds && <p className="mt-2 text-sm text-zinc-300">Stated use of funds: {d.use_of_funds}</p>}

            {d.hiring && (
              <div className="mt-4 grid gap-5 md:grid-cols-2">
                <div>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Likely roles (prediction)</h3>
                  <ul className="mt-2 space-y-2 text-sm">
                    {d.hiring.roles.map((r, i) => (
                      <li key={i} className="flex gap-2">
                        <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${CONFIDENCE[r.confidence] ?? "bg-zinc-500"}`} title={`${r.confidence} confidence`} />
                        <span>
                          <span className="font-medium">{r.role}</span>
                          <span className="ml-1 text-[10px] uppercase text-zinc-500">{r.confidence}</span>
                          <br />
                          <span className="text-zinc-400">{r.reason}</span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Outreach kit</h3>
                    <CopyButton text={d.hiring.outreach_note} />
                  </div>
                  <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-white/10 bg-black/30 p-3 font-sans text-sm text-zinc-200">
                    {d.hiring.outreach_note}
                  </pre>
                  <p className="mt-2 text-xs text-zinc-500">
                    Suggested channel: {d.hiring.best_channel} ({d.hiring.channel_reason})
                  </p>
                  <a
                    className="mt-1 inline-block text-sm text-cyan-300 underline-offset-2 hover:underline"
                    href={founderSearchUrl(d.company, d.founder_name)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Find {d.founder_name ?? "the founder"} on LinkedIn (search link)
                  </a>
                </div>
              </div>
            )}

            <p className="mt-4 text-xs text-zinc-500">
              Source:{" "}
              <a href={isHttpUrl(d.source_url) ? d.source_url : "#"} className="underline" target="_blank" rel="noopener noreferrer">
                {d.source_name}
              </a>
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
