"use client";

import { useState } from "react";
import { STAGES, type Extraction } from "../lib/schema";

const field = "w-full rounded-lg border border-white/10 bg-black/30 p-2 text-sm focus:border-cyan-400/60 focus:outline-none";

export default function AdminConsole() {
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [date, setDate] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceName, setSourceName] = useState("");
  const [raw, setRaw] = useState<Extraction | null>(null);
  const [draft, setDraft] = useState<Extraction | null>(null);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function call<T>(url: string, body?: unknown): Promise<T | null> {
    setBusy(true);
    setStatus("");
    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const data = (await res.json().catch(() => ({ error: "The server took too long or failed. Try again in a minute." }))) as T & { error?: string };
      if (!res.ok) {
        setStatus(data.error ?? "Request failed.");
        return null;
      }
      return data;
    } catch {
      setStatus("Network error.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  async function extract() {
    const out = await call<{ extraction: Extraction }>("/api/admin/extract", { title, text, publishedAt: date || undefined });
    if (out) {
      setRaw(out.extraction);
      setDraft(out.extraction);
      if (!out.extraction.is_funding_round) setStatus("The model does not think this is a funding round. Check before publishing.");
    }
  }

  async function publish() {
    if (!draft || !raw) return;
    const out = await call<{ id: string }>("/api/admin/publish", {
      extraction: draft,
      raw,
      source_url: sourceUrl,
      source_name: sourceName,
    });
    if (out) {
      setStatus(`Published. /deal/${out.id}`);
      setRaw(null);
      setDraft(null);
      setTitle("");
      setText("");
      setDate("");
      setSourceUrl("");
    }
  }

  async function clearSamples() {
    const out = await call<{ removed: number }>("/api/admin/sample-clear");
    if (out) setStatus(`Removed ${out.removed} sample rows.`);
  }

  const set = <K extends keyof Extraction>(k: K, v: Extraction[K]) => setDraft((d) => (d ? { ...d, [k]: v } : d));
  const str = (v: string) => (v.trim() === "" ? null : v);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Add a deal</h1>
        <button onClick={clearSamples} disabled={busy} className="rounded-lg border border-white/15 px-3 py-1 text-xs text-zinc-300 hover:border-red-400/60 disabled:opacity-40">
          Remove sample rows
        </button>
      </div>
      <p className="text-sm text-zinc-400">
        Paste the facts from a public report. Only extracted facts and the source link are stored; the pasted text is discarded.
      </p>

      <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.035] p-5">
        <input className={field} placeholder="Headline" value={title} onChange={(e) => setTitle(e.target.value)} />
        <textarea className={field} rows={7} maxLength={6000} placeholder="Article text or key paragraphs" value={text} onChange={(e) => setText(e.target.value)} />
        <div className="grid gap-3 sm:grid-cols-3">
          <input className={field} placeholder="Published (YYYY-MM-DD)" value={date} onChange={(e) => setDate(e.target.value)} />
          <input className={field} placeholder="Source name" value={sourceName} onChange={(e) => setSourceName(e.target.value)} />
          <input className={field} placeholder="Source link (https://...)" value={sourceUrl} onChange={(e) => setSourceUrl(e.target.value)} />
        </div>
        <button onClick={extract} disabled={busy || title.length < 3 || text.length < 20} className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-40">
          {busy && !draft ? "Working..." : "Extract facts"}
        </button>
      </div>

      {draft && (
        <div className="space-y-3 rounded-2xl border border-cyan-400/30 bg-white/[0.035] p-5">
          <h2 className="font-semibold">Review and correct</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <input className={field} placeholder="Company" value={draft.company ?? ""} onChange={(e) => set("company", str(e.target.value))} />
            <input className={field} placeholder="Amount as reported" value={draft.amount_raw ?? ""} onChange={(e) => set("amount_raw", str(e.target.value))} />
            <input className={field} type="number" placeholder="Amount value" value={draft.amount_value ?? ""} onChange={(e) => set("amount_value", e.target.value === "" ? null : Number(e.target.value))} />
            <select className={field} value={draft.currency ?? ""} onChange={(e) => set("currency", (e.target.value || null) as Extraction["currency"])}>
              <option value="">Currency</option>
              <option value="USD">USD</option>
              <option value="INR">INR</option>
              <option value="OTHER">OTHER</option>
            </select>
            <select className={field} value={draft.stage ?? ""} onChange={(e) => set("stage", (e.target.value || null) as Extraction["stage"])}>
              <option value="">Stage</option>
              {STAGES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <input className={field} placeholder="Sector" value={draft.sector ?? ""} onChange={(e) => set("sector", str(e.target.value))} />
            <input className={field} placeholder="City" value={draft.city ?? ""} onChange={(e) => set("city", str(e.target.value))} />
            <input className={field} placeholder="Announced (YYYY-MM-DD)" value={draft.announced_date ?? ""} onChange={(e) => set("announced_date", str(e.target.value))} />
            <input className={field} placeholder="Founder" value={draft.founder_name ?? ""} onChange={(e) => set("founder_name", str(e.target.value))} />
            <input className={field} placeholder="Investors (comma separated)" value={draft.investors.join(", ")} onChange={(e) => set("investors", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} />
          </div>
          <input className={field} placeholder="Stated use of funds" value={draft.use_of_funds ?? ""} onChange={(e) => set("use_of_funds", str(e.target.value))} />
          <button onClick={publish} disabled={busy || !draft.company || !sourceUrl || sourceName.length < 2} className="rounded-lg bg-emerald-400 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-40">
            {busy ? "Publishing..." : "Publish with hiring signals"}
          </button>
        </div>
      )}

      {status && <p className="text-sm text-zinc-300">{status}</p>}
    </div>
  );
}
