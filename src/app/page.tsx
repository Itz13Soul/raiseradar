import Link from "next/link";
import type { Metadata } from "next";
import GlobeLoader from "../components/GlobeLoader";
import { groupDeals, loadAllDeals } from "../lib/seo-data";
import { SITE_NAME, SITE_URL, jsonLd } from "../lib/seo";
import type { DealRow } from "../lib/schema";

export const revalidate = 300;

export const metadata: Metadata = {
  title: { absolute: "RaiseRadar: Indian startup funding rounds turned into hiring signals" },
  description:
    "RaiseRadar tracks Indian startup funding rounds and predicts the roles each company will hire next. Match your resume to funded startups, track outreach and get email alerts.",
  alternates: { canonical: "/" },
};

function money(d: DealRow): string {
  if (d.amount_raw) return d.amount_raw;
  if (d.amount_value == null) return "Undisclosed";
  return `${d.currency ?? ""} ${d.amount_value.toLocaleString("en-IN")}`.trim();
}

const AUDIENCES = [
  {
    who: "Job seekers",
    line: "Find startups that just got money and need your skills.",
    points: ["Upload your resume and get funded companies ranked by fit", "See the roles each company is likely to hire, with a reason", "A short outreach note you can edit and send"],
  },
  {
    who: "Recruiters",
    line: "Know which companies are about to hire before the job post.",
    points: ["A roles-in-demand board across your best matches", "Filter by stage, city and sector", "Save companies into a pipeline and track replies"],
  },
  {
    who: "Sales and agencies",
    line: "Reach freshly funded accounts while the budget is new.",
    points: ["Rank accounts by what their use of funds says they need", "A why-now line for every account", "Export your matches to CSV"],
  },
];

const STEPS = [
  ["Read", "Each public funding announcement is read and turned into company, amount, stage, investors, sector, city and use of funds."],
  ["Check", "A person reviews every field before it goes live. Unknown fields stay empty instead of guessed."],
  ["Predict", "From stage, sector and stated use of funds, up to five likely roles are predicted, each with a reason and a confidence."],
  ["Match", "Your profile is scored against every deal. You get a ranked list, a note to send and optional email alerts."],
];

const FAQ: [string, string][] = [
  ["What is RaiseRadar?", "RaiseRadar is a free tool that turns Indian startup funding announcements into hiring signals. For each funded company it shows the roles it is likely to hire next, a suggested outreach channel and a short note you can send."],
  ["How does RaiseRadar predict who is hiring?", "It uses the funding stage, the sector and what the company says it will spend the money on. Each predicted role has a stated reason and a low, medium or high confidence. These are predictions, not confirmed job openings."],
  ["Where does the funding data come from?", "From public funding announcements. A person reviews every deal, and each deal page links to its source so you can verify the details."],
  ["Is RaiseRadar free?", "Yes. It is a personal project by Divyansh Srivastava and is free to use. Signing in is optional and only needed for matching, the outreach pipeline and email alerts."],
  ["How accurate is it?", "Extraction was tested on 50 hand-labelled items: company, amount, city and date were all correct. Stage matched 54% strictly and 100% when Other counts as not stated. Profile matching was tested on 8 profiles over 38 real deals and scored 86.7% mean average precision, against 24.3% for a newest-first list. The labels were written by one author, so read these as upper bounds."],
  ["Does RaiseRadar store my resume?", "No. A resume you upload or paste is read in memory to fill your profile fields and is not stored or logged. Only the profile fields you save are kept, and you can delete your account at any time."],
  ["Who is RaiseRadar for?", "Job seekers who want to approach startups that just raised money, recruiters who want to know which companies will hire, and sales teams and agencies who want freshly funded accounts."],
];

export default async function Landing() {
  const deals = await loadAllDeals();
  const cityNames = deals.map((d) => d.city).filter((c): c is string => !!c);
  const cityCount = new Set(cityNames.map((c) => c.toLowerCase())).size;
  const roleCount = deals.reduce((n, d) => n + (d.hiring?.roles?.length ?? 0), 0);
  const newest = deals.map((d) => d.announced_date).filter((x): x is string => !!x).sort().pop();
  const latest = deals.filter((d) => d.hiring && d.hiring.roles.length > 0).slice(0, 5);
  const cities = groupDeals(deals, "city").slice(0, 8);
  const sectors = groupDeals(deals, "sector").slice(0, 8);

  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: SITE_URL, name: SITE_NAME, description: "Indian startup funding rounds turned into hiring signals.", inLanguage: "en-IN" },
      {
        "@type": "WebApplication",
        name: SITE_NAME,
        url: SITE_URL,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Any",
        offers: { "@type": "Offer", price: "0", priceCurrency: "INR" },
        author: { "@type": "Person", name: "Divyansh Srivastava" },
        description: "Predicts which roles Indian startups will hire next after a funding round, and matches job seekers, recruiters and sales teams to them.",
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
      },
    ],
  };

  return (
    <main>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />

      <section className="mx-auto grid w-full max-w-6xl items-center gap-10 px-4 pb-14 pt-12 md:grid-cols-[1.2fr_0.8fr] md:pt-20">
        <div>
          <p className="hero-in inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/[0.07] px-3 py-1 text-xs font-medium text-cyan-200">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-300" /> Indian startup funding, reviewed and updated
          </p>
          <h1 className="font-display hero-in mt-4 text-4xl font-semibold leading-[1.08] sm:text-5xl" style={{ animationDelay: "60ms" }}>
            Funding news tells you who raised. <span className="text-cyan-300">This tells you who will hire.</span>
          </h1>
          <p className="hero-in mt-5 max-w-xl text-lg text-zinc-300" style={{ animationDelay: "120ms" }}>
            RaiseRadar turns every Indian startup funding round into the roles it will likely open, a ranked match for your profile and a note to send the founder.
          </p>
          <div className="hero-in mt-8 flex flex-wrap gap-3" style={{ animationDelay: "180ms" }}>
            <Link href="/login" className="inline-block rounded-full bg-cyan-300 px-6 py-3 font-semibold text-zinc-950 transition hover:bg-cyan-200">
              Build my radar
            </Link>
            <Link href="/deals" className="inline-block rounded-full border border-white/20 px-6 py-3 font-semibold transition hover:bg-white/5">
              Browse the deals
            </Link>
          </div>
          <dl className="hero-in mt-10 grid max-w-xl grid-cols-2 gap-4 sm:grid-cols-4" style={{ animationDelay: "240ms" }}>
            {[
              [deals.length, "reviewed deals"],
              [cityCount, "cities"],
              [roleCount, "predicted roles"],
              [newest ?? "n/a", "latest round"],
            ].map(([v, l]) => (
              <div key={String(l)} className="border-l border-white/10 pl-3">
                <dd className="text-xl font-semibold tabular-nums">{v}</dd>
                <dt className="text-xs text-zinc-400">{l}</dt>
              </div>
            ))}
          </dl>
        </div>
        <div className="relative mx-auto aspect-square w-full max-w-sm">
          <GlobeLoader cities={cityNames} />
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-16" aria-labelledby="who">
        <h2 id="who" className="font-display text-2xl font-semibold">Built for three kinds of people</h2>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {AUDIENCES.map((a) => (
            <article key={a.who} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 transition hover:border-cyan-300/30">
              <h3 className="text-lg font-semibold">{a.who}</h3>
              <p className="mt-1 text-sm text-zinc-300">{a.line}</p>
              <ul className="mt-4 space-y-2 text-sm text-zinc-300">
                {a.points.map((p) => (
                  <li key={p} className="flex gap-2">
                    <span aria-hidden className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
                    {p}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </section>

      {latest.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-4 pb-16" aria-labelledby="latest">
          <div className="flex items-baseline justify-between">
            <h2 id="latest" className="font-display text-2xl font-semibold">Latest hiring signals</h2>
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

      <section className="mx-auto w-full max-w-6xl px-4 pb-16" aria-labelledby="how">
        <h2 id="how" className="font-display text-2xl font-semibold">How it works</h2>
        <ol className="mt-6 grid gap-4 md:grid-cols-4">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="rounded-2xl border border-white/10 p-5">
              <span className="font-display text-sm text-cyan-300">0{i + 1}</span>
              <h3 className="mt-1 text-lg font-semibold">{t}</h3>
              <p className="mt-2 text-sm text-zinc-400">{d}</p>
            </li>
          ))}
        </ol>
        <p className="mt-4 text-xs text-zinc-500">Predicted roles are probability, not proof, and are not confirmed openings.</p>
      </section>

      {(cities.length > 0 || sectors.length > 0) && (
        <section className="mx-auto w-full max-w-6xl px-4 pb-16" aria-labelledby="browse">
          <h2 id="browse" className="font-display text-2xl font-semibold">Browse funded startups</h2>
          <div className="mt-5 grid gap-8 md:grid-cols-2">
            {cities.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">By city</h3>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {cities.map((g) => (
                    <li key={g.slug}>
                      <Link href={`/cities/${g.slug}`} className="rounded-full border border-white/10 px-3 py-1 text-sm text-zinc-300 hover:bg-white/5">{g.label} ({g.deals.length})</Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {sectors.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">By sector</h3>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {sectors.map((g) => (
                    <li key={g.slug}>
                      <Link href={`/sectors/${g.slug}`} className="rounded-full border border-white/10 px-3 py-1 text-sm text-zinc-300 hover:bg-white/5">{g.label} ({g.deals.length})</Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      <section className="mx-auto w-full max-w-3xl px-4 pb-16" aria-labelledby="faq">
        <h2 id="faq" className="font-display text-2xl font-semibold">Frequently asked questions</h2>
        <div className="mt-5 divide-y divide-white/10 border-y border-white/10">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium">
                {q}
                <span aria-hidden className="text-cyan-300 transition group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 pb-20">
        <div className="rounded-3xl border border-cyan-300/20 bg-gradient-to-br from-cyan-300/10 to-violet-400/10 p-8 text-center">
          <h2 className="font-display text-2xl font-semibold sm:text-3xl">See which funded startups fit you</h2>
          <p className="mx-auto mt-2 max-w-xl text-zinc-300">Sign in with your email, upload your resume and get a ranked list in under a minute. No password.</p>
          <Link href="/login" className="mt-5 inline-block rounded-full bg-cyan-300 px-6 py-3 font-semibold text-zinc-950 hover:bg-cyan-200">Build my radar</Link>
        </div>
      </section>
    </main>
  );
}
