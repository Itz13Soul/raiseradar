"use client";

import { useState } from "react";
import { useAuth } from "./AuthProvider";
import { AUDIENCES, AUDIENCE_COPY, parseList, type Audience, type Profile } from "../lib/profile";
import { STAGES } from "../lib/schema";
import { track } from "../lib/track";

const AUTOFILL_LABEL: Record<Audience, string> = {
  job_seeker: "Paste your resume text",
  recruiter: "Paste a job description or candidate profile",
  sales: "Paste a description of what you sell",
};

export default function ProfileForm({ initial, onSaved }: { initial: Profile | null; onSaved: (p: Profile) => void }) {
  const { db, user, session } = useAuth();
  const [audience, setAudience] = useState<Audience>(initial?.audience ?? "job_seeker");
  const [roles, setRoles] = useState((initial?.roles ?? []).join(", "));
  const [skills, setSkills] = useState((initial?.skills ?? []).join(", "));
  const [cities, setCities] = useState((initial?.cities ?? []).join(", "));
  const [sectors, setSectors] = useState((initial?.sectors ?? []).join(", "));
  const [stages, setStages] = useState<string[]>(initial?.stages ?? []);
  const [paste, setPaste] = useState("");
  const [busy, setBusy] = useState<"" | "fill" | "save">("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const copy = AUDIENCE_COPY[audience];

  async function autofill() {
    if (!session) return;
    setBusy("fill");
    setMsg(null);
    try {
      const res = await fetch("/api/resume", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${session.access_token}` },
        body: JSON.stringify({ audience, text: paste }),
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error ?? "Could not read that text.");
      const merge = (cur: string, add: string[], max: number) => parseList([cur, ...add].filter(Boolean).join(","), max).join(", ");
      setRoles((c) => merge(c, j.roles ?? [], 10));
      setSkills((c) => merge(c, j.skills ?? [], 20));
      setCities((c) => merge(c, j.cities ?? [], 10));
      setSectors((c) => merge(c, j.sectors ?? [], 10));
      setPaste("");
      setMsg({ kind: "ok", text: "Fields filled. Review and edit them, then save. The pasted text was not stored." });
      track("profile_autofill", { audience });
    } catch (e) {
      setMsg({ kind: "err", text: e instanceof Error ? e.message : "Could not read that text." });
    } finally {
      setBusy("");
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!db || !user) return;
    setBusy("save");
    setMsg(null);
    const row = {
      user_id: user.id,
      audience,
      roles: copy.showRoles ? parseList(roles, 10) : [],
      skills: parseList(skills, 20),
      cities: parseList(cities, 10),
      sectors: parseList(sectors, 10),
      stages,
      updated_at: new Date().toISOString(),
    };
    const { error } = await db.from("profiles").upsert(row, { onConflict: "user_id" });
    setBusy("");
    if (error) {
      setMsg({ kind: "err", text: "Could not save your profile. Try again." });
      return;
    }
    track("profile_saved", { audience });
    onSaved(row as Profile);
  }

  const field = "w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none focus:border-cyan-300";

  return (
    <form onSubmit={save} className="space-y-5 rounded-2xl border border-white/10 bg-white/[0.035] p-5">
      <fieldset>
        <legend className="text-sm font-medium">Who are you?</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {AUDIENCES.map((a) => (
            <label
              key={a}
              className={`cursor-pointer rounded-full border px-4 py-1.5 text-sm ${audience === a ? "border-cyan-300 bg-cyan-300/10 text-cyan-200" : "border-white/10 text-zinc-300 hover:bg-white/5"}`}
            >
              <input type="radio" name="audience" value={a} checked={audience === a} onChange={() => setAudience(a)} className="sr-only" />
              {AUDIENCE_COPY[a].label}
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="paste" className="text-sm font-medium">
          {AUTOFILL_LABEL[audience]} <span className="font-normal text-zinc-500">(optional, fills the fields below)</span>
        </label>
        <textarea id="paste" value={paste} onChange={(e) => setPaste(e.target.value)} rows={4} maxLength={8000} className={`${field} mt-2`} placeholder="Text is sent to the AI model to extract fields, then discarded. Do not paste anything confidential." />
        <button
          type="button"
          onClick={autofill}
          disabled={busy !== "" || paste.trim().length < 40}
          className="mt-2 rounded-full border border-white/15 px-4 py-1.5 text-sm hover:bg-white/5 disabled:opacity-40"
        >
          {busy === "fill" ? "Reading…" : "Fill fields from text"}
        </button>
      </div>

      {copy.showRoles && (
        <div>
          <label htmlFor="roles" className="text-sm font-medium">{copy.rolesLabel}</label>
          <input id="roles" value={roles} onChange={(e) => setRoles(e.target.value)} className={`${field} mt-1`} placeholder={copy.rolesHint} />
        </div>
      )}
      <div>
        <label htmlFor="skills" className="text-sm font-medium">{copy.skillsLabel}</label>
        <input id="skills" value={skills} onChange={(e) => setSkills(e.target.value)} className={`${field} mt-1`} placeholder={copy.skillsHint} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="cities" className="text-sm font-medium">Cities</label>
          <input id="cities" value={cities} onChange={(e) => setCities(e.target.value)} className={`${field} mt-1`} placeholder="Bengaluru, Mumbai" />
        </div>
        <div>
          <label htmlFor="sectors" className="text-sm font-medium">Sectors</label>
          <input id="sectors" value={sectors} onChange={(e) => setSectors(e.target.value)} className={`${field} mt-1`} placeholder="Fintech, HealthTech" />
        </div>
      </div>
      <fieldset>
        <legend className="text-sm font-medium">Stages</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {STAGES.map((s) => {
            const on = stages.includes(s);
            return (
              <label key={s} className={`cursor-pointer rounded-full border px-3 py-1 text-xs ${on ? "border-cyan-300 bg-cyan-300/10 text-cyan-200" : "border-white/10 text-zinc-400 hover:bg-white/5"}`}>
                <input type="checkbox" checked={on} onChange={() => setStages((cur) => (on ? cur.filter((x) => x !== s) : [...cur, s]))} className="sr-only" />
                {s}
              </label>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-zinc-500">Leave a field empty to match anything. Empty fields never count against a deal.</p>
      </fieldset>

      {msg && (
        <p role={msg.kind === "err" ? "alert" : "status"} className={`text-sm ${msg.kind === "err" ? "text-red-300" : "text-emerald-300"}`}>
          {msg.text}
        </p>
      )}
      <button type="submit" disabled={busy !== ""} className="rounded-full bg-cyan-300 px-5 py-2 font-medium text-black hover:bg-cyan-200 disabled:opacity-50">
        {busy === "save" ? "Saving…" : "Save profile and see matches"}
      </button>
    </form>
  );
}
