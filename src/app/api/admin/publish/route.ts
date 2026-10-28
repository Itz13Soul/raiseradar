import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "../../../../lib/admin";
import { ExtractionSchema, companyKey, isHttpUrl } from "../../../../lib/schema";
import { hiringSignals } from "../../../../lib/signals";
import { supabaseService } from "../../../../lib/supabase";

export const maxDuration = 60;

const Body = z.object({
  extraction: ExtractionSchema,
  raw: ExtractionSchema,
  source_url: z.string().trim().max(500),
  source_name: z.string().trim().min(2).max(120),
});

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "The deal details are incomplete or invalid." }, { status: 400 });
  const { extraction: d, raw, source_url, source_name } = parsed.data;
  if (!isHttpUrl(source_url)) return NextResponse.json({ error: "The source link must start with http or https." }, { status: 400 });
  if (!d.company?.trim()) return NextResponse.json({ error: "Company name is required." }, { status: 400 });

  try {
    const hiring = await hiringSignals({ ...d, is_funding_round: true });
    const db = supabaseService();
    const { data, error } = await db
      .from("deals")
      .insert({
        company: d.company.trim(),
        company_key: companyKey(d.company),
        amount_value: d.amount_value,
        currency: d.currency,
        amount_raw: d.amount_raw,
        stage: d.stage,
        investors: d.investors,
        sector: d.sector,
        city: d.city,
        announced_date: d.announced_date,
        use_of_funds: d.use_of_funds,
        founder_name: d.founder_name,
        source_url,
        source_name,
        hiring,
        raw_extraction: raw,
        reviewed: true,
        is_sample: false,
      })
      .select("id")
      .single();
    if (error) {
      const message = error.code === "23505" ? "This source link has already been added." : error.message;
      return NextResponse.json({ error: message }, { status: error.code === "23505" ? 409 : 500 });
    }
    return NextResponse.json({ id: data.id });
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 300) }, { status: 502 });
  }
}
