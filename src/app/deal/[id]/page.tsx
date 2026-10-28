import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import CopyButton from "../../../components/CopyButton";
import NoteBuilder from "../../../components/NoteBuilder";
import { supabaseAnon } from "../../../lib/supabase";
import { founderSearchUrl } from "../../../lib/signals";
import { isHttpUrl, type DealRow } from "../../../lib/schema";

export const revalidate = 300;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function load(id: string): Promise<DealRow | null> {
  const db = supabaseAnon();
  if (!db || !UUID.test(id)) return null;
  const { data } = await db.from("deals").select("*").eq("id", id).maybeSingle();
  return (data as DealRow | null) ?? null;
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

  return (
    <main className="mx-auto w-full max-w-4xl px-4 pb-10">
      <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-200">
        Back to deals
      </Link>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight">{deal.company}</h1>
      <p className="mt-2 text-zinc-400">
        {[deal.amount_raw, deal.stage, deal.sector, deal.city, deal.announced_date].filter(Boolean).join(" · ")}
      </p>
      {deal.investors.length > 0 && <p className="mt-1 text-sm text-zinc-400">Investors: {deal.investors.join(", ")}</p>}
      {deal.use_of_funds && <p className="mt-3 text-zinc-300">Stated use of funds: {deal.use_of_funds}</p>}
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
              Find {deal.founder_name ?? "the founder"} on LinkedIn (search link)
            </a>
          </div>
        </section>
      )}

      <div className="mt-6">
        <NoteBuilder dealId={deal.id} />
      </div>

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
