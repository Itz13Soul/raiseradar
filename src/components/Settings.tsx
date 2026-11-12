"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { track } from "../lib/track";

type Sub = { frequency: "daily" | "weekly"; min_score: number; active: boolean; last_sent_at: string | null };

export default function Settings() {
  const { db, user, session, signOut } = useAuth();
  const router = useRouter();
  const [sub, setSub] = useState<Sub | null>(null);
  const [hasProfile, setHasProfile] = useState(true);
  const [frequency, setFrequency] = useState<"daily" | "weekly">("weekly");
  const [minScore, setMinScore] = useState(40);
  const [consent, setConsent] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [ready, setReady] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!db || !user) return;
    let alive = true;
    Promise.all([
      db.from("alert_subscriptions").select("frequency,min_score,active,last_sent_at").eq("user_id", user.id).maybeSingle(),
      db.from("profiles").select("user_id").eq("user_id", user.id).maybeSingle(),
    ]).then(([a, p]) => {
      if (!alive) return;
      const s = a.data as Sub | null;
      setSub(s);
      if (s) {
        setFrequency(s.frequency);
        setMinScore(s.min_score);
        setConsent(s.active);
      }
      setHasProfile(!!p.data);
      setReady(true);
    });
    return () => {
      alive = false;
    };
  }, [db, user]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!db || !user) return;
    setMsg(null);
    const row = { user_id: user.id, frequency, min_score: minScore, active: consent };
    const { error } = await db.from("alert_subscriptions").upsert(row, { onConflict: "user_id" });
    if (error) {
      setMsg({ kind: "err", text: "Could not save. Try again." });
      return;
    }
    setSub({ frequency, min_score: minScore, active: consent, last_sent_at: sub?.last_sent_at ?? null });
    setMsg({ kind: "ok", text: consent ? "Alerts are on." : "Alerts are off." });
    track("alerts_saved", { frequency, active: consent });
  }

  async function deleteAccount() {
    if (!session) return;
    const res = await fetch("/api/account/delete", { method: "POST", headers: { authorization: `Bearer ${session.access_token}` } });
    if (!res.ok) {
      setMsg({ kind: "err", text: "Could not delete the account. Try again." });
      return;
    }
    track("account_deleted");
    await signOut();
    router.push("/");
  }

  if (!ready) return <p className="py-10 text-zinc-400">Loading settings…</p>;

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-semibold tracking-tight">Email alerts</h1>
      <p className="mt-1 text-sm text-zinc-400">
        A digest of new funded companies that score above your minimum for your profile, sent to <span className="text-zinc-200">{user?.email}</span>.
      </p>
      {!hasProfile && <p className="mt-4 rounded-lg bg-amber-400/10 p-3 text-sm text-amber-200">Set up your profile first. Alerts rank deals against it.</p>}

      <form onSubmit={save} className="mt-5 space-y-4 rounded-2xl border border-white/10 bg-white/[0.035] p-5">
        <div>
          <label htmlFor="freq" className="text-sm font-medium">How often</label>
          <select id="freq" value={frequency} onChange={(e) => setFrequency(e.target.value as "daily" | "weekly")} className="mt-1 block rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm">
            <option value="weekly">Weekly</option>
            <option value="daily">Daily</option>
          </select>
        </div>
        <div>
          <label htmlFor="ms" className="text-sm font-medium">Minimum match score: <span className="tabular-nums">{minScore}</span></label>
          <input id="ms" type="range" min={10} max={90} step={5} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} className="mt-1 block w-full" />
        </div>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-1" />
          <span>Email me this digest. I can unsubscribe at any time using the link in every email or by switching this off.</span>
        </label>
        <button type="submit" className="rounded-full bg-cyan-300 px-5 py-2 font-medium text-black hover:bg-cyan-200">Save alert settings</button>
        {msg && <p role={msg.kind === "err" ? "alert" : "status"} className={`text-sm ${msg.kind === "err" ? "text-red-300" : "text-emerald-300"}`}>{msg.text}</p>}
        {sub?.last_sent_at && <p className="text-xs text-zinc-500">Last digest sent {new Date(sub.last_sent_at).toLocaleDateString("en-IN")}.</p>}
      </form>

      <section className="mt-10 rounded-2xl border border-red-400/20 p-5">
        <h2 className="text-lg font-semibold">Delete my account</h2>
        <p className="mt-1 text-sm text-zinc-400">Permanently deletes your login, profile, shortlist, notes and alert settings.</p>
        {confirmDelete ? (
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={deleteAccount} className="rounded-full bg-red-400 px-4 py-1.5 text-sm font-medium text-black">Yes, delete everything</button>
            <button type="button" onClick={() => setConfirmDelete(false)} className="rounded-full border border-white/15 px-4 py-1.5 text-sm">Cancel</button>
          </div>
        ) : (
          <button type="button" onClick={() => setConfirmDelete(true)} className="mt-3 rounded-full border border-red-400/40 px-4 py-1.5 text-sm text-red-300 hover:bg-red-400/10">Delete my account</button>
        )}
      </section>
    </div>
  );
}
