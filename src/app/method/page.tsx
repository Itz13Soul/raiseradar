import { measureAccuracy, ACCURACY_FIELDS } from "../../lib/accuracy";
import { supabaseAnon } from "../../lib/supabase";
import type { DealRow } from "../../lib/schema";

export const revalidate = 600;

const MIN_REVIEWED = 50;

export default async function Method() {
  const db = supabaseAnon();
  let reviewed: DealRow[] = [];
  if (db) {
    const { data } = await db.from("deals").select("*").eq("reviewed", true).eq("is_sample", false).limit(2000);
    reviewed = (data ?? []) as DealRow[];
  }
  const acc = measureAccuracy(reviewed);
  const enough = acc.n >= MIN_REVIEWED;

  return (
    <main className="mx-auto w-full max-w-3xl px-4 pb-10">
      <h1 className="text-3xl font-semibold tracking-tight">How it works</h1>
      <ol className="mt-6 list-decimal space-y-3 pl-5 text-zinc-300">
        <li>A person reads a public funding report and pastes the relevant text into a private console.</li>
        <li>A language model extracts the facts: company, amount, stage, investors, sector, city, date, use of funds.</li>
        <li>The person checks and corrects every field before publishing. Only facts and the source link are stored, never the article text.</li>
        <li>A second model call predicts likely roles from stage, sector and stated use of funds, with a reason and a confidence for each.</li>
      </ol>

      <h2 className="mt-10 text-xl font-semibold">Extraction accuracy</h2>
      <p className="mt-2 text-sm text-zinc-400">
        Measured by comparing the model&apos;s first extraction with the human-corrected value on published deals. Amounts match within 1 percent.
      </p>
      {acc.n === 0 ? (
        <p className="mt-4 rounded-lg bg-white/5 p-3 text-sm text-zinc-300">No reviewed deals yet, so no score is reported.</p>
      ) : (
        <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.035] p-5">
          <p className="text-sm text-zinc-400">
            Reviewed deals: <span className="text-zinc-100">{acc.n}</span>
            {!enough && ` (a score is only meaningful from ${MIN_REVIEWED} deals, so treat these as early numbers)`}
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            {ACCURACY_FIELDS.map((f) => (
              <li key={f} className="flex justify-between">
                <span>{f.replace("_", " ")}</span>
                <span className="tabular-nums">{Math.round((acc.perField[f] ?? 0) * 100)}%</span>
              </li>
            ))}
            <li className="flex justify-between border-t border-white/10 pt-1 font-medium">
              <span>All fields correct</span>
              <span className="tabular-nums">{Math.round((acc.allCorrect ?? 0) * 100)}%</span>
            </li>
          </ul>
        </div>
      )}

      <h2 className="mt-10 text-xl font-semibold">Limits</h2>
      <ul className="mt-2 list-disc space-y-2 pl-5 text-sm text-zinc-300">
        <li>Hiring signals are predictions, not confirmed openings. Probability, not proof. Not legal or financial advice.</li>
        <li>The deal list is curated by hand and does not cover the whole market.</li>
        <li>Role predictions are not yet scored against real job postings.</li>
      </ul>
    </main>
  );
}
