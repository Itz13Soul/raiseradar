import { NextResponse } from "next/server";
import { z } from "zod";
import { personalNote } from "../../../lib/signals";
import { supabaseAnon, supabaseService } from "../../../lib/supabase";
import type { DealRow } from "../../../lib/schema";

export const maxDuration = 30;

const Body = z.object({
  dealId: z.string().uuid(),
  audience: z.enum(["job_seeker", "sales"]),
  about: z.string().trim().min(10).max(400),
});

export async function POST(req: Request) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Describe yourself in 10 to 400 characters." }, { status: 400 });
  }
  const anon = supabaseAnon();
  if (!anon) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  const { data } = await anon.from("deals").select("*").eq("id", parsed.data.dealId).maybeSingle();
  const deal = data as DealRow | null;
  if (!deal) return NextResponse.json({ error: "Deal not found." }, { status: 404 });

  const cap = Math.max(1, Number(process.env.NOTE_DAILY_CAP ?? 150));
  const { data: allowed, error } = await supabaseService().rpc("bump_note_usage", { cap });
  if (error) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  if (!allowed) {
    return NextResponse.json({ error: "The daily limit for personalised notes has been reached. Try again tomorrow." }, { status: 429 });
  }

  try {
    const note = await personalNote(deal, parsed.data.audience, parsed.data.about);
    return NextResponse.json({ note });
  } catch {
    return NextResponse.json({ error: "Could not generate the note. Please try again." }, { status: 502 });
  }
}
