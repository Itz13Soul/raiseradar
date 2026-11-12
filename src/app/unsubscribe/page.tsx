import type { Metadata } from "next";
import { supabaseService } from "../../lib/supabase";

export const metadata: Metadata = { title: "Unsubscribe", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Unsubscribe({ searchParams }: PageProps<"/unsubscribe">) {
  const raw = (await searchParams).t;
  const token = Array.isArray(raw) ? raw[0] : raw;
  let ok = false;
  if (token && UUID.test(token)) {
    const { data, error } = await supabaseService().from("alert_subscriptions").update({ active: false }).eq("unsubscribe_token", token).select("user_id");
    ok = !error && (data?.length ?? 0) > 0;
  }
  return (
    <main className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="text-2xl font-semibold">{ok ? "You are unsubscribed" : "Link not valid"}</h1>
      <p className="mt-2 text-zinc-400">
        {ok ? "You will not get more RaiseRadar digests. You can turn alerts back on in My radar." : "This unsubscribe link is invalid or already used. You can also switch alerts off in My radar."}
      </p>
    </main>
  );
}
