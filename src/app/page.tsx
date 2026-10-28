import Link from "next/link";
import { supabaseAnon } from "../lib/supabase";
import { founderSearchUrl } from "../lib/signals";
import { STAGES, type DealRow } from "../lib/schema";

export const revalidate = 300;

type Params = { city?: string; sector?: string; stage?: string; role?: string };

function money(d: DealRow): string {
  if (d.amount_raw) return d.amount_raw;
  if (d.amount_value == null) return "Undisclosed";
  return `${d.currency ?? ""} ${d.amount_value.toLocaleString("en-IN")}`.trim();
}

export default async function Home({ searchParams }: PageProps<"/">) {
  const sp = (await searchParams) as Params;
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
    if (sp.city) q = q.ilike("city", sp.city);
    if (sp.sector) q = q.ilike("sector", `%${sp.sector}%`);
    if (sp.stage) q = q.eq("stage", sp.stage);
    const { data, error } = await q;
    if (error) loadError = error.message;
    deals = (data ?? []) as DealRow[];
    if (sp.role) {
      const needle = sp.role.toLowerCase();
      deals = deals.filter((d) => d.hiring?.roles?.some((r) => r.role.toLowerCase().includes(needle)));
    }
  }

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold tracking-tight">RaiseRadar</h1>
        <p className="mt-1 text-zinc-600">
          Every Indian funding round, turned into who is likely to hire, and what to say.{" "}
          <Link href="/brief" className="underline">
            Weekly brief
          </Link>
        </p>
        <p className="mt-3 rounded border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Hiring signals are predictions inferred from stage, sector and stated use of funds. They are not confirmed
          openings. Verify every deal at its linked source before acting.
        </p>
      </header>

      <form className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-5" method="get">
        <input name="city" defaultValue={sp.city} placeholder="City" className="rounded border p-2" />
        <input name="sector" defaultValue={sp.sector} placeholder="Sector" className="rounded border p-2" />
        <select name="stage" defaultValue={sp.stage ?? ""} className="rounded border p-2">
          <option value="">Any stage</option>
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input name="role" defaultValue={sp.role} placeholder="Role (e.g. engineering)" className="rounded border p-2" />
        <button className="rounded bg-zinc-900 p-2 text-white">Filter</button>
      </form>

      {loadError && <p className="mb-4 rounded bg-red-50 p-3 text-sm text-red-800">{loadError}</p>}
      {!loadError && deals.length === 0 && (
        <p className="text-zinc-600">No deals match yet. The ingest job fills this list from the configured feeds.</p>
      )}

      <ul className="space-y-4">
        {deals.map((d) => (
          <li key={d.id} className="rounded-lg border bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="text-lg font-semibold">
                {d.company}
                {d.is_sample && (
                  <span className="ml-2 rounded bg-purple-100 px-2 py-0.5 text-xs font-medium text-purple-800">
                    SAMPLE DATA
                  </span>
                )}
              </h2>
              <span className="text-sm text-zinc-600">
                {money(d)} · {d.stage ?? "Stage n/a"} · {d.announced_date ?? "Date n/a"}
              </span>
            </div>
            <p className="mt-1 text-sm text-zinc-600">
              {[d.sector, d.city].filter(Boolean).join(" · ") || "Sector and city not stated"}
              {d.investors.length > 0 && ` · Investors: ${d.investors.join(", ")}`}
            </p>
            {d.use_of_funds && <p className="mt-1 text-sm">Stated use of funds: {d.use_of_funds}</p>}

            {d.hiring && (
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div>
                  <h3 className="text-sm font-semibold">Likely roles (prediction)</h3>
                  <ul className="mt-1 space-y-1 text-sm">
                    {d.hiring.roles.map((r, i) => (
                      <li key={i}>
                        <span className="font-medium">{r.role}</span>{" "}
                        <span className="text-xs uppercase text-zinc-500">[{r.confidence}]</span>
                        <br />
                        <span className="text-zinc-600">{r.reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Outreach kit</h3>
                  <pre className="mt-1 whitespace-pre-wrap rounded bg-zinc-50 p-2 font-sans text-sm">
                    {d.hiring.outreach_note}
                  </pre>
                  <p className="mt-1 text-xs text-zinc-600">
                    Suggested channel: {d.hiring.best_channel} ({d.hiring.channel_reason})
                  </p>
                  <a
                    className="mt-1 inline-block text-sm underline"
                    href={founderSearchUrl(d.company, d.founder_name)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Find {d.founder_name ?? "the founder"} on LinkedIn (search link)
                  </a>
                </div>
              </div>
            )}

            <p className="mt-3 text-xs text-zinc-500">
              Source:{" "}
              <a href={d.source_url} className="underline" target="_blank" rel="noopener noreferrer">
                {d.source_name}
              </a>
            </p>
          </li>
        ))}
      </ul>
    </main>
  );
}
