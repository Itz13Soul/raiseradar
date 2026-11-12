import { NextResponse } from "next/server";
import { supabaseService } from "../../../lib/supabase";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function off(token: string | null): Promise<boolean> {
  if (!token || !UUID.test(token)) return false;
  const { data, error } = await supabaseService().from("alert_subscriptions").update({ active: false }).eq("unsubscribe_token", token).select("user_id");
  return !error && (data?.length ?? 0) > 0;
}

// Mail clients send an RFC 8058 one-click POST to the List-Unsubscribe URL.
export async function POST(req: Request) {
  const ok = await off(new URL(req.url).searchParams.get("t"));
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}

export async function GET(req: Request) {
  const ok = await off(new URL(req.url).searchParams.get("t"));
  return NextResponse.json({ ok }, { status: ok ? 200 : 404 });
}
