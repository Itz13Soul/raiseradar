"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthProvider";
import ProfileForm from "./ProfileForm";
import ShortlistButton from "./ShortlistButton";
import { loadDeals, loadProfile, money, type DealLite } from "../lib/client-data";
import { rankDeals, profileIsEmpty, type MatchResult } from "../lib/match";
import { AUDIENCE_COPY, type Profile } from "../lib/profile";
import { toCsv } from "../lib/csv";
import { track } from "../lib/track";

type Ranked = DealLite & MatchResult;
const DOT: Record<string, string> = { high: "bg-emerald-400", medium: "bg-amber-400", low: "bg-zinc-500" };

export default function MyRadar() {
  const { db, user } = useAuth();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [deals, setDeals] = useState<DealLite[]>([]);
  const [ready, setReady] = useState(false);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState("");
  const [minScore, setMinScore] = useState(30);

  useEffect(() => {
    if (!db || !user) return;
    let alive = true;
    Promise.all([loadProfile(db, user.id), loadDeals(db)])
      .then(([p, d]) => {
        if (!alive) return;
        setProfile(p);
        setDeals(d);
        setEditing(!p);
        setReady(true);
      })
      .catch(() => {
        if (alive) {
          setError("Could not load your radar. Refresh to try again.");
          setReady(true);
        }
      });
    return () => {
      alive = false;
    };
  }, [db, user]);

  const ranked: Ranked[] = useMemo(() => (profile ? rankDeals(profile, deals) : []), [profile, deals]);
  const shown = ranked.filter((d) => d.score >= minScore).slice(0, 30);

  const demand = useMemo(() => {
    const m = new Map<string, { n: number; companies: string[] }>();
    for (const d of shown) {
      for (const r of d.hiring?.roles ?? []) {
        if (r.confidence === "low") continue;
        const e = m.get(r.role) ?? { n: 0, companies: [] };
        e.n += 1;
        if (e.companies.length < 4) e.companies.push(d.company);
        m.set(r.role, e);
      }
    }
    return [...m.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 8);
  }, [shown]);

  function exportCsv() {
    const csv = toCsv(
      ["Company", "Score", "Round", "Stage", "Sector", "City", "Announced", "Use of funds", "Why it matches", "Founder (from source)"],
      shown.map((d) => [d.company, d.score, money(d), d.stage, d.sector, d.city, d.announced_date, d.use_of_funds, d.reasons.join("; "), d.founder_name]),
    );
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "raiseradar-matches.csv";
    a.click();
    URL.revokeObjectURL(url);
    track("matches_export_csv", { rows: shown.length });
  }

  if (!ready) return <p className="px-4 py-10 text-zinc-400">Loading your radar…</p>;
  if (error) return <p role="alert" className="px-4 py-10 text-red-300">{error}</p>;

  if (editing || !profile) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Set up your radar</h1>
        <p className="mt-1 mb-5 text-sm text-zinc-400">Tell us who you are and what you want. We rank every funded company against it.</p>
        <ProfileForm
          initial={profile}
          onSaved={(p) => {
            setProfile(p);
            setEditing(false);
          }}
        />
      </div>
    );
  }

  const copy = AUDIENCE_COPY[profile.audience];
  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{copy.title}</h1>
          <p className="mt-1 text-sm text-zinc-400">{copy.blurb}</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => setEditing(true)} className="rounded-full border border-white/15 px-4 py-1.5 text-sm hover:bg-white/5">
            Edit profile
          </button>
          {profile.audience === "sales" && (
            <button type="button" onClick={exportCsv} disabled={shown.length === 0} className="rounded-full border border-white/15 px-4 py-1.5 text-sm hover:bg-white/5 disabled:opacity-40">
              Export CSV
            </button>
          )}
        </div>
      </div>

      {profileIsEmpty(profile) && (
        <p className="mt-4 rounded-lg bg-amber-400/10 p-3 text-sm text-amber-200">
          Your profile is empty, so deals are ranked by recency only. Add roles, skills, cities or sectors for real matches.
        </p>
      )}

      <div className="mt-4 flex items-center gap-3 text-sm text-zinc-400">
        <label htmlFor="min">Minimum match</label>
        <input id="min" type="range" min={0} max={90} step={5} value={minScore} onChange={(e) => setMinScore(Number(e.target.value))} />
        <span className="tabular-nums text-zinc-200">{minScore}</span>
        <span>· {shown.length} shown of {ranked.length}</span>
      </div>

      {profile.audience === "recruiter" && demand.length > 0 && (
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.035] p-5">
          <h2 className="text-lg font-semibold">Roles in demand across your matches</h2>
          <p className="mt-1 text-xs text-zinc-500">Counts medium and high confidence predicted roles. Predictions, not confirmed openings.</p>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {demand.map(([role, v]) => (
              <li key={role} className="rounded-lg border border-white/10 p-3 text-sm">
                <span className="font-medium">{role}</span>
                <span className="ml-2 text-zinc-400">{v.n} companies</span>
                <p className="mt-1 text-xs text-zinc-500">{v.companies.join(", ")}</p>
              </li>
            ))}
          </ul>
        </section>
      )}

      {shown.length === 0 ? (
        <p className="mt-8 text-zinc-400">No deals above this score. Lower the minimum or widen your profile.</p>
      ) : (
        <ul className="mt-6 space-y-3">
          {shown.map((d) => (
            <li key={d.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/deal/${d.id}`} className="text-lg font-semibold hover:text-cyan-200" onClick={() => track("match_open", { audience: profile.audience })}>
                    {d.company}
                  </Link>
                  <p className="text-sm text-zinc-400">{[money(d), d.stage, d.sector, d.city, d.announced_date].filter(Boolean).join(" · ")}</p>
                </div>
                <div className="text-right" aria-label={`Match score ${d.score} out of 100`}>
                  <div className="text-2xl font-semibold tabular-nums text-cyan-200">{d.score}</div>
                  <div className="text-[10px] uppercase tracking-wide text-zinc-500">match</div>
                </div>
              </div>
              {d.reasons.length > 0 && (
                <ul className="mt-2 flex flex-wrap gap-1.5">
                  {d.reasons.map((r) => (
                    <li key={r} className="rounded-full bg-white/5 px-2.5 py-0.5 text-xs text-zinc-300">{r}</li>
                  ))}
                </ul>
              )}
              {profile.audience !== "sales" && d.hiring && (
                <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-400">
                  {d.hiring.roles.slice(0, 3).map((r) => (
                    <span key={r.role} className="inline-flex items-center gap-1">
                      <span className={`h-1.5 w-1.5 rounded-full ${DOT[r.confidence]}`} />
                      {r.role}
                    </span>
                  ))}
                </p>
              )}
              {profile.audience === "sales" && d.use_of_funds && <p className="mt-2 text-sm text-zinc-300">Why now: {d.use_of_funds}</p>}
              <div className="mt-3">
                <ShortlistButton dealId={d.id} compact />
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-6 text-xs text-zinc-500">
        Match score is a transparent 0 to 100 heuristic over role, skills, sector, stage, city and recency, not a prediction of hiring. Predicted roles are probability, not proof. See <Link href="/method" className="underline">Method</Link>.
      </p>
    </div>
  );
}
