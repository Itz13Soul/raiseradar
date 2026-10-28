import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { fetchFeed } from "../../../lib/feeds";
import { extractDeal } from "../../../lib/extract";
import { hiringSignals } from "../../../lib/signals";
import { companyKey, isHttpUrl } from "../../../lib/schema";
import { supabaseService } from "../../../lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

function authorised(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

export async function GET(req: Request) {
  if (!authorised(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const feeds = (process.env.FEED_URLS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (feeds.length === 0) {
    return NextResponse.json({ error: "FEED_URLS is empty. Add only feeds whose terms permit reuse." }, { status: 400 });
  }

  const max = Math.max(1, Number(process.env.MAX_ITEMS_PER_RUN ?? 8));
  const db = supabaseService();
  const report = { feeds: feeds.length, seen: 0, skippedExisting: 0, notFunding: 0, inserted: 0, errors: [] as string[] };

  for (const feedUrl of feeds) {
    let items;
    try {
      items = await fetchFeed(feedUrl);
    } catch (e) {
      report.errors.push(String(e));
      continue;
    }

    for (const item of items) {
      if (report.inserted + report.notFunding >= max) break;
      if (!isHttpUrl(item.link)) continue;
      report.seen++;

      const { data: existing } = await db.from("deals").select("id").eq("source_url", item.link).maybeSingle();
      if (existing) {
        report.skippedExisting++;
        continue;
      }

      try {
        const d = await extractDeal({ title: item.title, snippet: item.snippet, publishedAt: item.publishedAt });
        if (!d.is_funding_round || !d.company) {
          report.notFunding++;
          continue;
        }
        const key = companyKey(d.company);
        const { data: dupe } = await db
          .from("deals")
          .select("id")
          .eq("company_key", key)
          .eq("stage", d.stage ?? "")
          .limit(1);
        if (dupe && dupe.length > 0) {
          report.skippedExisting++;
          continue;
        }

        const hiring = await hiringSignals(d);
        const { error } = await db.from("deals").insert({
          company: d.company,
          company_key: key,
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
          source_url: item.link,
          source_name: item.sourceName,
          hiring,
          is_sample: false,
        });
        if (error) throw new Error(error.message);
        report.inserted++;
      } catch (e) {
        report.errors.push(`${item.link}: ${String(e).slice(0, 200)}`);
      }
    }
  }

  return NextResponse.json(report);
}
