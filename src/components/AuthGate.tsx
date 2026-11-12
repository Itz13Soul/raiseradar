"use client";

import Link from "next/link";
import { useAuth } from "./AuthProvider";

export default function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, loading, configured } = useAuth();
  if (!configured) {
    return <p className="mx-auto max-w-xl px-4 py-16 text-zinc-400">Accounts are not configured on this deployment.</p>;
  }
  if (loading) return <p className="mx-auto max-w-xl px-4 py-16 text-zinc-400">Loading your radar…</p>;
  if (!user) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold">Sign in to use My radar</h1>
        <p className="mt-2 text-zinc-400">Save your profile, get matched deals, track outreach and receive email alerts.</p>
        <Link href="/login" className="mt-6 inline-block rounded-full bg-cyan-300 px-5 py-2 font-medium text-black hover:bg-cyan-200">
          Sign in with email
        </Link>
      </div>
    );
  }
  return <>{children}</>;
}
