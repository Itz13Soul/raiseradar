import { NextResponse } from "next/server";
import { isAdmin } from "../../../../lib/admin";
import { supabaseService } from "../../../../lib/supabase";

export async function POST() {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  const { error, count } = await supabaseService()
    .from("deals")
    .delete({ count: "exact" })
    .eq("is_sample", true);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ removed: count ?? 0 });
}
