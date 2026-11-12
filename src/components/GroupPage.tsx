import Link from "next/link";
import type { Group } from "../lib/group";
import { SITE_URL, jsonLd } from "../lib/seo";
import type { DealRow } from "../lib/schema";

function money(d: DealRow): string {
  if (d.amount_raw) return d.amount_raw;
  if (d.amount_value == null) return "Undisclosed";
  return `${d.currency ?? ""} ${d.amount_value.toLocaleString("en-IN")}`.trim();
}

function tally(values: string[], top: number): [string, number][] {
  const m = new Map<string, number>();
  for (const v of values) m.set(v, (m.get(v) ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, top);
}

export default function GroupPage({ kind, group, others }: { kind: "city" | "sector"; group: Group; others: Group[] }) {
  const base = kind === "city" ? "cities" : "sectors";
  const { deals, label } = group;
  const dates = deals.map((d) => d.announced_date).filter((x): x is string => !!x).sort();
  const roles = tally(deals.flatMap((d) => (d.hiring?.roles ?? []).filter((r) => r.confidence !== "low").map((r) => r.role)), 6);
  const stages = tally(deals.map((d) => d.stage).filter((x): x is string => !!x && x !== "Other"), 4);
  const h1 = kind === "city" ? `Funded startups in ${label} and the roles they are likely to hire` : `${label} startups that just raised funding, and who they will hire`;
  const url = `${SITE_URL}/${base}/${group.slug}`;

  const ld = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "RaiseRadar", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: kind === "city" ? "Cities" : "Sectors", item: `${SITE_URL}/deals` },
          { "@type": "ListItem", position: 3, name: label, item: url },
        ],
      },
      {
        "@type": "ItemList",
        name: h1,
        itemListElement: deals.slice(0, 50).map((d, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE_URL}/deal/${d.id}`, name: d.company })),
      },
    ],
  };

  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-16 pt-8">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(ld) }} />
      <nav aria-label="Breadcrumb" className="text-sm text-zinc-400">
        <Link href="/" className="hover:text-zinc-200">Home</Link> / <Link href="/deals" className="hover:text-zinc-200">Deals</Link> / <span className="text-zinc-200">{label}</span>
      </nav>
      <h1 className="font-display mt-4 text-3xl font-semibold leading-tight sm:text-4xl">{h1}</h1>
      <p className="mt-4 max-w-3xl text-zinc-300">
        RaiseRadar has {deals.length} reviewed funding rounds {kind === "city" ? `from ${label}` : `in ${label}`}
        {dates.length > 0 ? `, announced between ${dates[0]} and ${dates[dates.length - 1]}` : ""}.
        {stages.length > 0 ? ` The most common stages are ${stages.map(([s, n]) => `${s} (${n})`).join(", ")}.` : ""}
        {roles.length > 0 ? ` The roles predicted most often are ${roles.map(([r, n]) => `${r} (${n})`).join(", ")}.` : ""} Roles are predictions from stage, sector and stated use of funds, not confirmed openings.
      </p>

      <ul className="mt-8 divide-y divide-white/10 border-y border-white/10">
        {deals.map((d) => (
          <li key={d.id}>
            <Link href={`/deal/${d.id}`} className="grid gap-1 py-4 transition hover:bg-white/[0.03] sm:grid-cols-[1.1fr_1fr_1.6fr] sm:items-center sm:gap-6 sm:px-2">
              <span className="font-medium">{d.company}</span>
              <span className="text-sm text-zinc-400">{[money(d), d.stage, kind === "city" ? d.sector : d.city].filter(Boolean).join(" · ")}</span>
              <span className="text-sm text-zinc-200">{d.hiring?.roles?.[0] ? `Likely to hire: ${d.hiring.roles[0].role}` : "No role prediction"}</span>
            </Link>
          </li>
        ))}
      </ul>

      <section className="mt-10 rounded-2xl border border-cyan-300/20 bg-cyan-300/[0.05] p-5">
        <h2 className="font-display text-xl font-semibold">Get matched to these companies</h2>
        <p className="mt-1 text-sm text-zinc-300">Create a free profile and RaiseRadar ranks every funded company by fit for your role, skills and city, with an outreach note for each.</p>
        <Link href="/login" className="mt-3 inline-block rounded-full bg-cyan-300 px-5 py-2 text-sm font-semibold text-zinc-950 hover:bg-cyan-200">Build my radar</Link>
      </section>

      {others.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-400">More {kind === "city" ? "cities" : "sectors"}</h2>
          <ul className="mt-3 flex flex-wrap gap-2">
            {others.map((o) => (
              <li key={o.slug}>
                <Link href={`/${base}/${o.slug}`} className="rounded-full border border-white/10 px-3 py-1 text-sm text-zinc-300 hover:bg-white/5">{o.label} ({o.deals.length})</Link>
              </li>
            ))}
          </ul>
        </section>
      )}
      <p className="mt-8 text-xs text-zinc-500">Funding details come from public announcements; verify at the linked source on each deal page. Predicted hiring is probability, not proof.</p>
    </main>
  );
}
