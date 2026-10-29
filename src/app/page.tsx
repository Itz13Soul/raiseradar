import Link from "next/link";
import GlobeLoader from "../components/GlobeLoader";
import { supabaseAnon } from "../lib/supabase";
import type { DealRow } from "../lib/schema";

export const revalidate = 300;

function money(d: DealRow): string {
  if (d.amount_raw) return d.amount_raw;
  if (d.amount_value == null) return "Undisclosed";
  return `${d.currency ?? ""} ${d.amount_value.toLocaleString("en-IN")}`.trim();
}

const STEPS = [
  { t: "Collect", b: "Public funding announcements, each kept with a link back to the original report." },
  { t: "Extract", b: "A model reads the announcement into company, amount, stage, city and date. A person checks every field before it goes live." },
  { t: "Predict", b: "From stage, sector and stated use of funds, it lists roles the company is likely to open, each with a reason and a confidence." },
  { t: "Reach", b: "You get a short note to send the founder and a search link to find them. Nothing is sent for you." },
];

const SCORES: [string, number, string][] = [
  ["Funding or not", 100, "50 of 50"],
  ["Company", 100, "50 of 50"],
  ["Amount", 100, "within 1%"],
  ["City", 100, "50 of 50"],
  ["Announced date", 100, "50 of 50"],
  ["Stage, strict match", 54, "27 of 50"],
];

export default async function Landing() {
  const db = supabaseAnon();
  let deals: DealRow[] = [];
  if (db) {
    const { data } = await db.from("deals").select("*").order("announced_date", { ascending: false, nullsFirst: false }).limit(40);
    deals = (data ?? []) as DealRow[];
  }
  const featured = deals.find((d) => d.hiring && d.hiring.roles.length > 0) ?? null;
  const cities = deals.map((d) => d.city).filter((c): c is string => !!c);
  const ticker = deals.slice(0, 14);
  const roleCount = deals.reduce((n, d) => n + (d.hiring?.roles?.length ?? 0), 0);

  return (
    <main className="overflow-x-clip">
      <section className="relative">
        <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden />
        <div className="relative mx-auto grid w-full max-w-6xl items-center gap-8 px-4 pb-16 pt-14 md:grid-cols-[1.1fr_0.9fr] md:pt-20">
          <div>
            <p className="hero-in inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-sm text-cyan-100" style={{ animationDelay: "0ms" }}>
              <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" /> India funding intelligence
            </p>
            <h1 className="font-display hero-in mt-5 text-4xl font-semibold leading-[1.05] sm:text-5xl lg:text-6xl" style={{ animationDelay: "90ms" }}>
              Funding news tells you who raised. This tells you who will hire.
            </h1>
            <p className="hero-in mt-6 max-w-lg text-lg text-zinc-300" style={{ animationDelay: "180ms" }}>
              Every Indian funding round becomes a list of likely roles with reasons, plus a three-line note to send the founder.
            </p>
            <div className="hero-in mt-8 flex flex-wrap gap-3" style={{ animationDelay: "270ms" }}>
              <Link href="/deals" className="rounded-full bg-cyan-300 px-6 py-3 font-semibold text-zinc-950 shadow-[0_0_40px_-8px_rgba(103,232,249,0.8)] transition hover:bg-cyan-200">
                Browse the deals
              </Link>
              <Link href="/method" className="rounded-full border border-white/20 px-6 py-3 font-medium text-zinc-100 transition hover:bg-white/5">
                See how it is measured
              </Link>
            </div>
            <dl className="hero-in mt-10 flex gap-8 text-sm" style={{ animationDelay: "360ms" }}>
              <div>
                <dt className="text-zinc-400">Deals live</dt>
                <dd className="font-display text-3xl font-semibold tabular-nums">{deals.length}</dd>
              </div>
              <div>
                <dt className="text-zinc-400">Predicted roles</dt>
                <dd className="font-display text-3xl font-semibold tabular-nums">{roleCount}</dd>
              </div>
              <div>
                <dt className="text-zinc-400">Reviewed by a person</dt>
                <dd className="font-display text-3xl font-semibold tabular-nums">{deals.filter((d) => d.reviewed).length}</dd>
              </div>
            </dl>
          </div>

          <div className="relative mx-auto aspect-square w-full max-w-md">
            <div className="sweep absolute inset-[19%] rounded-full" />
            <div className="absolute inset-0">
              <GlobeLoader cities={cities} />
            </div>
            {featured && (
              <div className="glass float-y absolute -bottom-2 left-0 w-64 rounded-2xl p-4 shadow-2xl sm:-left-6">
                <p className="text-xs text-zinc-400">Latest signal</p>
                <p className="font-display mt-1 text-lg font-semibold">{featured.company}</p>
                <p className="text-sm text-cyan-200">{money(featured)} · {featured.stage ?? "Stage not stated"}</p>
                <p className="mt-2 text-sm text-zinc-200">
                  Likely to hire: <span className="font-medium">{featured.hiring!.roles[0].role}</span>
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {ticker.length > 0 && (
        <section aria-label="Latest deals" className="border-y border-white/[0.07] bg-white/[0.02] py-4">
          <div className="marquee gap-3">
            {[...ticker, ...ticker].map((d, i) => (
              <Link
                key={`${d.id}-${i}`}
                href={`/deal/${d.id}`}
                aria-hidden={i >= ticker.length}
                tabIndex={i >= ticker.length ? -1 : 0}
                className="mx-1.5 flex shrink-0 items-center gap-3 rounded-full border border-white/10 bg-white/[0.03] px-4 py-2 text-sm transition hover:border-cyan-300/40"
              >
                <span className="font-medium">{d.company}</span>
                <span className="text-cyan-200">{money(d)}</span>
                <span className="text-zinc-400">{d.stage ?? "Stage n/a"}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto w-full max-w-6xl px-4 py-20">
        <h2 className="font-display max-w-2xl text-3xl font-semibold sm:text-4xl">From a headline to a first message in four steps</h2>
        <ol className="mt-10 grid gap-4 md:grid-cols-4">
          {STEPS.map((s, i) => (
            <li key={s.t} className="glass relative rounded-2xl p-5">
              <span className="font-display text-4xl font-semibold text-cyan-300/80">{i + 1}</span>
              <h3 className="font-display mt-3 text-xl font-semibold">{s.t}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">{s.b}</p>
            </li>
          ))}
        </ol>
      </section>

      {featured && featured.hiring && (
        <section className="mx-auto w-full max-w-6xl px-4 pb-20">
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <div className="glass rounded-3xl p-6 sm:p-8">
              <p className="text-sm text-zinc-400">A real signal from the live data</p>
              <h2 className="font-display mt-1 text-3xl font-semibold">{featured.company}</h2>
              <p className="text-cyan-200">{money(featured)} · {featured.stage ?? "Stage not stated"} · {featured.announced_date ?? "Date not stated"}</p>
              <ul className="mt-6 space-y-3">
                {featured.hiring.roles.slice(0, 3).map((r) => (
                  <li key={r.role} className="rounded-xl border border-white/10 bg-black/30 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium">{r.role}</span>
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${r.confidence === "high" ? "bg-emerald-400/15 text-emerald-200" : r.confidence === "medium" ? "bg-amber-400/15 text-amber-200" : "bg-zinc-500/20 text-zinc-300"}`}>
                        {r.confidence} confidence
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-zinc-400">{r.reason}</p>
                  </li>
                ))}
              </ul>
              <Link href={`/deal/${featured.id}`} className="mt-6 inline-block font-medium text-cyan-200 underline-offset-4 hover:underline">
                Open the full kit and outreach note
              </Link>
            </div>
            <div className="grid gap-4">
              <div className="glass rounded-3xl p-6">
                <h3 className="font-display text-xl font-semibold">A person checks every deal</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-300">The model drafts, a human corrects and publishes. Only facts and the source link are stored, never the article text.</p>
              </div>
              <div className="glass rounded-3xl p-6">
                <h3 className="font-display text-xl font-semibold">Predictions, not promises</h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-300">Roles come from stage, sector and stated use of funds. They are not confirmed openings, so verify at the source before you act.</p>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="mx-auto w-full max-w-6xl px-4 pb-20">
        <div className="grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">How accurate is the extraction?</h2>
            <p className="mt-4 text-zinc-300">
              Tested on 50 funding items from Entrackr weekly reports, run through the live extractor on 29 October 2026.
            </p>
            <p className="mt-3 text-sm text-zinc-400">
              The labels were written by the project author with no second labeller, and the inputs are short summaries, so read this as an upper bound. Stage reads 54% under a strict match because unstated rounds were labelled blank while the model returns Other. Counting Other as not stated, it is 100%.
            </p>
            <Link href="/method" className="mt-5 inline-block font-medium text-cyan-200 underline-offset-4 hover:underline">
              Read the full method
            </Link>
          </div>
          <ul className="glass space-y-4 rounded-3xl p-6">
            {SCORES.map(([label, pct, note]) => (
              <li key={label}>
                <div className="flex justify-between text-sm">
                  <span>{label}</span>
                  <span className="tabular-nums text-zinc-300">{pct}% · {note}</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10" role="presentation">
                  <div className={`h-full rounded-full ${pct === 100 ? "bg-cyan-300" : "bg-amber-300"}`} style={{ width: `${pct}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-20">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-cyan-300/10 via-transparent to-violet-400/10 p-8 sm:p-12">
          <h2 className="font-display max-w-2xl text-3xl font-semibold sm:text-4xl">Where it fits next to what you already use</h2>
          <p className="mt-4 max-w-2xl text-zinc-300">
            Entrackr and Inc42 report the rounds. Tracxn and Crunchbase hold deal databases. RaiseRadar adds the step after the headline: the roles a company is likely to open and the note to send.
          </p>
          <Link href="/deals" className="mt-8 inline-block rounded-full bg-cyan-300 px-6 py-3 font-semibold text-zinc-950 transition hover:bg-cyan-200">
            Browse the deals
          </Link>
        </div>
      </section>
    </main>
  );
}
