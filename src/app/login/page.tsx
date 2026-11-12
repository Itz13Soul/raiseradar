"use client";

import { useState } from "react";
import Link from "next/link";
import { useAuth } from "../../components/AuthProvider";
import { track } from "../../lib/track";

export default function LoginPage() {
  const { db, user, configured } = useAuth();
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [msg, setMsg] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!db) return;
    setState("sending");
    setMsg("");
    const { error } = await db.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/my`, shouldCreateUser: true },
    });
    if (error) {
      setState("error");
      setMsg(error.message);
    } else {
      setState("sent");
      track("login_link_requested");
    }
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">Sign in to RaiseRadar</h1>
      <p className="mt-2 text-sm text-zinc-400">
        No password. We email you a one-time sign-in link. Your profile, shortlist and alert settings are private to your account.
      </p>
      {!configured && <p className="mt-6 rounded-lg bg-amber-400/10 p-3 text-sm text-amber-200">Accounts are not configured on this deployment.</p>}
      {user ? (
        <p className="mt-6 text-sm">
          You are signed in as <span className="font-medium">{user.email}</span>.{" "}
          <Link href="/my" className="text-cyan-300 underline">
            Go to My radar
          </Link>
        </p>
      ) : state === "sent" ? (
        <p className="mt-6 rounded-lg bg-emerald-400/10 p-4 text-sm text-emerald-200" role="status">
          Check your inbox for the sign-in link. It can take a minute. Check spam if it does not arrive.
        </p>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-3">
          <label className="block text-sm" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 outline-none focus:border-cyan-300"
            placeholder="you@example.com"
          />
          <button
            type="submit"
            disabled={!configured || state === "sending"}
            className="w-full rounded-full bg-cyan-300 px-5 py-2 font-medium text-black hover:bg-cyan-200 disabled:opacity-50"
          >
            {state === "sending" ? "Sending…" : "Email me a sign-in link"}
          </button>
          {state === "error" && (
            <p className="text-sm text-red-300" role="alert">
              {msg || "Could not send the link. Try again in a minute."}
            </p>
          )}
        </form>
      )}
      <p className="mt-8 text-xs text-zinc-500">
        By signing in you agree to the <Link href="/privacy" className="underline">privacy notice</Link>.
      </p>
    </main>
  );
}
