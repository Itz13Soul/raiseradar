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

export default async function Landing() {
  const db = supabaseAnon();
  let deals: DealRow[] = [];
  if (db) {
    const { data } = await db.from("deals").select("*").order("announced_date", { ascending: false, nullsFirst: false }).limit(40);
    deals = (data ?? []) as DealRow[];
  }
  const cities = deals.map((d) => d.city).filter((c): c is string => !!c);
  const latest = deals.filter((d) => d.hiring && d.hiring.roles.length > 0).slice(0, 4);

  return (
    <main>
      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pb-16 pt-12 md:grid-cols-[1.2fr_0.8fr] md:pt-20">
        <div>
          <h1 className="font-display hero-in text-4xl font-semibold leading-[1.08] sm:text-5xl">
            Funding news tells you who raised. This tells you who will hire.
          </h1>
          <p className="hero-in mt-5 max-w-md text-lg text-zinc-300" style={{ animationDelay: "100ms" }}>
            Every Indian funding round, turned into the roles it will likely open and a note to send the founder.
          </p>
          <div className="hero-in mt-8" style={{ animationDelay: "200ms" }}>
            <Link href="/deals" className="inline-block rounded-full bg-cyan-300 px-6 py-3 font-semibold text-zinc-950 transition hover:bg-cyan-200">
              Browse the deals
            </Link>
          </div>
        </div>
        <div className="relative mx-auto aspect-square w-full max-w-sm">
          <GlobeLoader cities={cities} />
        </div>
      </section>

      {latest.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-4 pb-16">
          <div className="flex items-baseline justify-between">
            <h2 className="font-display text-2xl font-semibold">Latest signals</h2>
            <Link href="/deals" className="text-sm text-cyan-200 underline-offset-4 hover:underline">All deals</Link>
          </div>
          <ul className="mt-4 divide-y divide-white/10 border-y border-white/10">
            {latest.map((d) => (
              <li key={d.id}>
                <Link href={`/deal/${d.id}`} className="grid gap-1 py-4 transition hover:bg-white/[0.03] sm:grid-cols-[1fr_1fr_1.4fr] sm:items-center sm:gap-6 sm:px-2">
                  <span className="font-medium">{d.company}</span>
                  <span className="text-sm text-zinc-400">{money(d)} · {d.stage ?? "Stage not stated"}</span>
                  <span className="text-sm text-zinc-200">Likely to hire: {d.hiring!.roles[0].role}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mx-auto w-full max-w-6xl px-4 pb-20">
        <h2 className="font-display text-2xl font-semibold">How it works</h2>
        <p className="mt-3 max-w-2xl text-zinc-300">
          A model reads each public funding announcement and a person checks every field. From the stage, sector and stated use of funds it predicts likely roles, each with a reason and a confidence, and drafts a short note to send. Predictions are not confirmed openings.
        </p>
        <p className="mt-4 text-sm text-zinc-400">
          Extraction was tested on 50 items: company, amount, city and date were all correct. Stage matched 54% strictly and 100% when &quot;Other&quot; counts as not stated. The labels are mine, so read it as an upper bound.{" "}
          <Link href="/method" className="text-cyan-200 underline-offset-4 hover:underline">Method</Link>
        </p>
      </section>
    </main>
  );
}
