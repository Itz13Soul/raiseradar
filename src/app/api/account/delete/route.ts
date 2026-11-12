import { NextResponse } from "next/server";
import { supabaseService } from "../../../../lib/supabase";
import { userFromRequest } from "../../../../lib/api-auth";

export const dynamic = "force-dynamic";

// Deletes the signed-in user. profiles, shortlist and alert_subscriptions cascade from auth.users.
export async function POST(req: Request) {
  const user = await userFromRequest(req);
  if (!user) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const { error } = await supabaseService().auth.admin.deleteUser(user.id);
  if (error) return NextResponse.json({ error: "Could not delete the account. Try again." }, { status: 502 });
  return NextResponse.json({ ok: true });
}
