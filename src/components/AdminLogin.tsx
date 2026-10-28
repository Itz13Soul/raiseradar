"use client";

import { useState } from "react";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (res.ok) window.location.reload();
      else setError(((await res.json()) as { error?: string }).error ?? "Login failed.");
    } catch {
      setError("Network error.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto mt-10 max-w-sm space-y-3 rounded-2xl border border-white/10 bg-white/[0.035] p-5">
      <h1 className="text-lg font-semibold">Console</h1>
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        autoComplete="current-password"
        placeholder="Password"
        className="w-full rounded-lg border border-white/10 bg-black/30 p-2 text-sm focus:border-cyan-400/60 focus:outline-none"
      />
      {error && <p className="text-sm text-red-300">{error}</p>}
      <button disabled={busy || !password} className="w-full rounded-lg bg-cyan-400 p-2 text-sm font-semibold text-zinc-950 disabled:opacity-40">
        {busy ? "Checking..." : "Sign in"}
      </button>
    </form>
  );
}
