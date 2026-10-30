"use client";

import { track } from "../lib/track";
import { useState } from "react";
import CopyButton from "./CopyButton";

export default function NoteBuilder({ dealId }: { dealId: string }) {
  const [audience, setAudience] = useState<"job_seeker" | "sales">("job_seeker");
  const [about, setAbout] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function generate() {
    setBusy(true);
    setError("");
    setNote("");
    try {
      const res = await fetch("/api/note", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ dealId, audience, about }),
      });
      const data = (await res.json()) as { note?: string; error?: string };
      if (!res.ok || !data.note) { setError(data.error ?? "Something went wrong."); track("note_error", { audience }); }
      else { setNote(data.note); track("note_generated", { audience }); }
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-5 backdrop-blur">
      <h2 className="text-lg font-semibold">Personalise this note</h2>
      <p className="mt-1 text-sm text-zinc-400">Tell us who you are and get a three-line message written for this round.</p>
      <div className="mt-4 flex gap-2 text-sm">
        {(
          [
            ["job_seeker", "I am job hunting"],
            ["sales", "I sell to startups"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setAudience(value)}
            className={`rounded-full border px-3 py-1 transition ${
              audience === value ? "border-cyan-400 bg-cyan-400/15 text-cyan-100" : "border-white/15 text-zinc-400 hover:text-zinc-200"
            }`}
          >
            {label}
          </button>
        ))}
      </div>
      <textarea
        value={about}
        onChange={(e) => setAbout(e.target.value)}
        maxLength={400}
        rows={3}
        placeholder={audience === "job_seeker" ? "e.g. Backend engineer, 3 years in Python and payments APIs" : "e.g. We run outbound lead-gen for B2B SaaS teams"}
        className="mt-3 w-full rounded-lg border border-white/10 bg-black/30 p-2 text-sm placeholder:text-zinc-500 focus:border-cyan-400/60 focus:outline-none"
      />
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          disabled={busy || about.trim().length < 10}
          onClick={generate}
          className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-zinc-950 transition hover:bg-cyan-300 disabled:opacity-40"
        >
          {busy ? "Writing..." : "Write my note"}
        </button>
        <span className="text-xs text-zinc-500">{about.length}/400</span>
      </div>
      {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
      {note && (
        <div className="mt-4">
          <div className="flex justify-end">
            <CopyButton text={note} />
          </div>
          <pre className="mt-2 whitespace-pre-wrap rounded-lg border border-white/10 bg-black/30 p-3 font-sans text-sm text-zinc-200">{note}</pre>
        </div>
      )}
    </div>
  );
}
