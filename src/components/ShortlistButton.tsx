"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { track } from "../lib/track";

export default function ShortlistButton({ dealId, compact = false }: { dealId: string; compact?: boolean }) {
  const { db, user, loading } = useAuth();
  const [saved, setSaved] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    if (!db || !user) return;
    let alive = true;
    db.from("shortlist")
      .select("id")
      .eq("deal_id", dealId)
      .maybeSingle()
      .then(({ data }) => {
        if (alive) setSaved(!!data);
      });
    return () => {
      alive = false;
    };
  }, [db, user, dealId]);

  const cls = compact
    ? "rounded-full border border-white/15 px-3 py-1 text-xs hover:bg-white/5"
    : "rounded-full border border-white/15 px-4 py-1.5 text-sm hover:bg-white/5";

  if (loading) return null;
  if (!user) {
    return (
      <Link href="/login" className={cls}>
        Sign in to save
      </Link>
    );
  }

  async function toggle() {
    if (!db || !user) return;
    setBusy(true);
    setErr("");
    const { error } = saved
      ? await db.from("shortlist").delete().eq("deal_id", dealId)
      : await db.from("shortlist").insert({ user_id: user.id, deal_id: dealId });
    setBusy(false);
    if (error) {
      setErr("Could not update. Try again.");
      return;
    }
    track(saved ? "shortlist_remove" : "shortlist_add");
    setSaved(!saved);
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" onClick={toggle} disabled={busy || saved === null} aria-pressed={!!saved} className={`${cls} ${saved ? "border-cyan-300 text-cyan-200" : ""} disabled:opacity-50`}>
        {saved ? "Saved ✓" : "Save to pipeline"}
      </button>
      {saved && !compact && (
        <Link href="/my/pipeline" className="text-xs text-cyan-300 underline">
          Open pipeline
        </Link>
      )}
      {err && <span role="alert" className="text-xs text-red-300">{err}</span>}
    </span>
  );
}
