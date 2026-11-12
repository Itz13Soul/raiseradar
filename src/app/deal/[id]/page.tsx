import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import CopyButton from "../../../components/CopyButton";
import NoteBuilder from "../../../components/NoteBuilder";
import ShortlistButton from "../../../components/ShortlistButton";
import { supabaseAnon } from "../../../lib/supabase";
import { careersSearchUrl, firstFounder, founderSearchUrl } from "../../../lib/signals";
import { isHttpUrl, type DealRow } from "../../../lib/schema";

export const revalidate = 300;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function load(id: string): Promise<DealRow | null> {
  const db = supabaseAnon();
  if (!db || !UUID.test(id)) return null;
  const { data } = await db.from("deals").select("*").eq("id", id).maybeSingle();
  return (data as DealRow | null) ?? null;
}

const SIMILAR_COLS = "id,company,amount_raw,stage,sector,city,announced_date";
type Lite = Pick<DealRow, "id" | "company" | "amount_raw" | "stage" | "sector" | "city" | "announced_date">;

async function loadRelated(deal: DealRow): Promise<{ history: Lite[]; similar: Lite[] }> {
  const db = supabaseAnon();
  if (!db) return { history: [], similar: [] };
  const name = deal.company.replace(/[%_,()]/g, "").trim();
  const [h, s] = await Promise.all([
    name ? db.from("deals").select(SIMILAR_COLS).ilike("company", name).neq("id", deal.id).order("announced_date", { ascending: false }).limit(10) : Promise.resolve({ data: [] }),
    deal.sector
      ? db.from("deals").select(SIMILAR_COLS).ilike("sector", `%${deal.sector.replace(/[%_,()]/g, "").trim()}%`).neq("id", deal.id).order("announced_date", { ascending: false }).limit(12)
      : Promise.resolve({ data: [] }),
  ]);
  const history = (h.data ?? []) as Lite[];
  const pool = (s.data ?? []) as Lite[];
  // Same stage first, then the rest; at most four.
  const similar = [...pool.filter((d) => d.stage === deal.stage), ...pool.filter((d) => d.stage !== deal.stage)].slice(0, 4);
  return { history, similar };
}

export async function generateMetadata({ params }: PageProps<"/deal/[id]">): Promise<Metadata> {
  const deal = await load((await params).id);
  return { title: deal ? `${deal.company} hiring signals | RaiseRadar` : "Deal | RaiseRadar" };
}

const DOT: Record<string, string> = { high: "bg-emerald-400", medium: "bg-amber-400", low: "bg-zinc-500" };

export default async function DealPage({ params }: PageProps<"/deal/[id]">) {
  const deal = await load((await params).id);
  if (!deal) notFound();
  const h = deal.hiring;
  const { history, similar } = await loadRelated(deal);

  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-10">
      <Link href="/deals" className="text-sm text-zinc-400 hover:text-zinc-200">
        Back to deals
      </Link>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">{deal.company}</h1>
      <p className="mt-2 text-zinc-400">
        {[deal.amount_raw, deal.stage, deal.sector, deal.city, deal.announced_date].filter(Boolean).join(" · ")}
      </p>
      {deal.investors.length > 0 && <p className="mt-1 text-sm text-zinc-400">Investors: {deal.investors.join(", ")}</p>}
      {deal.use_of_funds && <p className="mt-3 text-zinc-300">Stated use of funds: {deal.use_of_funds}</p>}
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <ShortlistButton dealId={deal.id} />
        <a className="rounded-full border border-white/15 px-4 py-1.5 text-sm hover:bg-white/5" href={careersSearchUrl(deal.company)} target="_blank" rel="noopener noreferrer">
          Search careers page
        </a>
      </div>
      {deal.is_sample && <p className="mt-3 rounded-lg bg-violet-400/10 p-3 text-sm text-violet-200">Sample data for demonstration. Not a real deal.</p>}

      {h && (
        <section className="mt-8 grid gap-5 md:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
            <h2 className="text-lg font-semibold">Likely roles</h2>
            <p className="mt-1 text-xs text-zinc-500">Predictions from stage, sector and use of funds. Not confirmed openings.</p>
            <ul className="mt-3 space-y-3 text-sm">
              {h.roles.map((r, i) => (
                <li key={i} className="flex gap-2">
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${DOT[r.confidence]}`} />
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
          <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Starter note</h2>
              <CopyButton text={h.outreach_note} />
            </div>
            <pre className="mt-3 whitespace-pre-wrap rounded-lg border border-white/10 bg-black/30 p-3 font-sans text-sm text-zinc-200">{h.outreach_note}</pre>
            <p className="mt-3 text-xs text-zinc-500">
              Suggested channel: {h.best_channel} ({h.channel_reason})
            </p>
            <a
              className="mt-2 inline-block text-sm text-cyan-300 hover:underline"
              href={founderSearchUrl(deal.company, deal.founder_name)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Find {firstFounder(deal.founder_name) ?? "the founder"} on LinkedIn (search link)
            </a>
          </div>
        </section>
      )}

      <div className="mt-6">
        <NoteBuilder dealId={deal.id} />
      </div>

      {history.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Funding history</h2>
          <p className="mt-1 text-xs text-zinc-500">Other rounds for the same company name in our dataset. Not a complete cap table.</p>
          <ul className="mt-3 space-y-2 text-sm">
            {[deal as Lite, ...history]
              .sort((a, b) => (b.announced_date ?? "").localeCompare(a.announced_date ?? ""))
              .map((r) => (
                <li key={r.id} className="flex flex-wrap gap-x-3 text-zinc-300">
                  <span className="w-24 text-zinc-500">{r.announced_date ?? "Date n/a"}</span>
                  {r.id === deal.id ? <span className="font-medium">{[r.stage, r.amount_raw].filter(Boolean).join(" · ")} (this round)</span> : <Link className="hover:text-cyan-200" href={`/deal/${r.id}`}>{[r.stage, r.amount_raw].filter(Boolean).join(" · ") || r.company}</Link>}
                </li>
              ))}
          </ul>
        </section>
      )}

      {similar.length > 0 && (
        <section className="mt-8">
          <h2 className="text-lg font-semibold">Similar companies</h2>
          <p className="mt-1 text-xs text-zinc-500">Same sector in our dataset, same stage first.</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {similar.map((r) => (
              <li key={r.id}>
                <Link href={`/deal/${r.id}`} className="block rounded-xl border border-white/10 p-3 text-sm hover:bg-white/5">
                  <span className="font-medium">{r.company}</span>
                  <span className="block text-zinc-400">{[r.amount_raw, r.stage, r.city].filter(Boolean).join(" · ")}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <p className="mt-6 text-xs text-zinc-500">
        Source:{" "}
        <a href={isHttpUrl(deal.source_url) ? deal.source_url : "#"} className="underline" target="_blank" rel="noopener noreferrer">
          {deal.source_name}
        </a>
        . Verify details at the source. Predictions are probability, not proof.
      </p>
    </main>
  );
}
