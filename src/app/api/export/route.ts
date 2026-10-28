import { NextResponse } from "next/server";
import { toCsv } from "../../../lib/csv";
import { supabaseAnon } from "../../../lib/supabase";
import type { DealRow } from "../../../lib/schema";

export const dynamic = "force-dynamic";

const clean = (v: string | null) => (v ?? "").trim().slice(0, 60).replace(/[%_]/g, "") || undefined;

export async function GET(req: Request) {
  const db = supabaseAnon();
  if (!db) return NextResponse.json({ error: "Service unavailable." }, { status: 503 });
  const p = new URL(req.url).searchParams;
  const city = clean(p.get("city"));
  const sector = clean(p.get("sector"));
  const stage = clean(p.get("stage"));

  let q = db.from("deals").select("*").order("announced_date", { ascending: false, nullsFirst: false }).limit(500);
  if (city) q = q.ilike("city", city);
  if (sector) q = q.ilike("sector", `%${sector}%`);
  if (stage) q = q.eq("stage", stage);
  const { data, error } = await q;
  if (error) return NextResponse.json({ error: "Could not load deals." }, { status: 500 });

  const rows = ((data ?? []) as DealRow[]).map((d) => [
    d.company,
    d.amount_raw ?? "",
    d.stage,
    d.sector,
    d.city,
    d.announced_date,
    d.investors.join("; "),
    d.use_of_funds,
    d.hiring?.roles.map((r) => `${r.role} (${r.confidence})`).join("; ") ?? "",
    d.source_name,
    d.source_url,
    d.is_sample ? "yes" : "no",
  ]);
  const body = toCsv(
    ["company", "amount_as_reported", "stage", "sector", "city", "announced_date", "investors", "stated_use_of_funds", "predicted_roles", "source", "source_link", "sample_data"],
    rows,
  );
  return new NextResponse(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="raiseradar-deals.csv"',
    },
  });
}
