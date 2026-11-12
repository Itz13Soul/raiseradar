"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { STATUSES, STATUS_LABEL, type ShortlistRow, type Status } from "../lib/profile";
import { money, type DealLite } from "../lib/client-data";
import { track } from "../lib/track";

type Item = ShortlistRow & { deal: DealLite | null };

export default function Pipeline() {
  const { db, user } = useAuth();
  const [items, setItems] = useState<Item[]>([]);
  const [ready, setReady] = useState(false);
  const [filter, setFilter] = useState<Status | "all">("all");
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!db || !user) return;
    let alive = true;
    db.from("shortlist")
      .select("*, deal:deals(id,company,amount_value,currency,amount_raw,stage,sector,city,announced_date,use_of_funds,founder_name,hiring,is_sample)")
      .order("updated_at", { ascending: false })
      .then(({ data, error }) => {
        if (!alive) return;
        if (error) setErr("Could not load your pipeline. Refresh to try again.");
        setItems((data ?? []) as unknown as Item[]);
        setReady(true);
      });
    return () => {
      alive = false;
    };
  }, [db, user]);

  async function patch(id: string, change: Partial<Pick<ShortlistRow, "status" | "notes">>) {
    if (!db) return;
    setErr("");
    const { error } = await db.from("shortlist").update({ ...change, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) {
      setErr("Could not save. Try again.");
      return;
    }
    if (change.status) track("pipeline_status", { status: change.status });
    setItems((cur) => cur.map((i) => (i.id === id ? { ...i, ...change } : i)));
  }

  async function remove(id: string) {
    if (!db) return;
    const { error } = await db.from("shortlist").delete().eq("id", id);
    if (error) {
      setErr("Could not remove. Try again.");
      return;
    }
    setItems((cur) => cur.filter((i) => i.id !== id));
  }

  if (!ready) return <p className="py-10 text-zinc-400">Loading your pipeline…</p>;

  const counts = Object.fromEntries(STATUSES.map((s) => [s, items.filter((i) => i.status === s).length])) as Record<Status, number>;
  const shown = filter === "all" ? items : items.filter((i) => i.status === filter);

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Outreach pipeline</h1>
      <p className="mt-1 text-sm text-zinc-400">Track every company you reach out to, from saved to closed. Private to your account.</p>

      <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Filter by status">
        <button type="button" onClick={() => setFilter("all")} aria-pressed={filter === "all"} className={`rounded-full border px-3 py-1 text-xs ${filter === "all" ? "border-cyan-300 text-cyan-200" : "border-white/10 text-zinc-400"}`}>
          All {items.length}
        </button>
        {STATUSES.map((s) => (
          <button key={s} type="button" onClick={() => setFilter(s)} aria-pressed={filter === s} className={`rounded-full border px-3 py-1 text-xs ${filter === s ? "border-cyan-300 text-cyan-200" : "border-white/10 text-zinc-400"}`}>
            {STATUS_LABEL[s]} {counts[s]}
          </button>
        ))}
      </div>
      {err && <p role="alert" className="mt-3 text-sm text-red-300">{err}</p>}

      {shown.length === 0 ? (
        <p className="mt-8 text-zinc-400">
          Nothing here yet. Save companies from <Link href="/my" className="text-cyan-300 underline">your matches</Link> or any deal page.
        </p>
      ) : (
        <ul className="mt-6 space-y-3">
          {shown.map((i) => (
            <li key={i.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  {i.deal ? (
                    <Link href={`/deal/${i.deal.id}`} className="text-lg font-semibold hover:text-cyan-200">{i.deal.company}</Link>
                  ) : (
                    <span className="text-lg font-semibold">Removed deal</span>
                  )}
                  {i.deal && <p className="text-sm text-zinc-400">{[money(i.deal), i.deal.stage, i.deal.city].filter(Boolean).join(" · ")}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <label className="sr-only" htmlFor={`st-${i.id}`}>Status</label>
                  <select id={`st-${i.id}`} value={i.status} onChange={(e) => patch(i.id, { status: e.target.value as Status })} className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-sm">
                    {STATUSES.map((s) => (
                      <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => remove(i.id)} className="text-xs text-zinc-500 hover:text-red-300">Remove</button>
                </div>
              </div>
              <NotesField id={i.id} value={i.notes} onSave={(notes) => patch(i.id, { notes })} />
              <p className="mt-1 text-[11px] text-zinc-600">Updated {new Date(i.updated_at).toLocaleDateString("en-IN")}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function NotesField({ id, value, onSave }: { id: string; value: string; onSave: (v: string) => void }) {
  const [v, setV] = useState(value);
  return (
    <div className="mt-3">
      <label htmlFor={`n-${id}`} className="sr-only">Notes</label>
      <textarea
        id={`n-${id}`}
        value={v}
        onChange={(e) => setV(e.target.value)}
        onBlur={() => v !== value && onSave(v.slice(0, 1000))}
        maxLength={1000}
        rows={2}
        placeholder="Notes: who you contacted, what they said, next step"
        className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-cyan-300"
      />
    </div>
  );
}
