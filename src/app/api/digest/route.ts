import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { supabaseService } from "../../../lib/supabase";
import { dueNow, pickForDigest, renderDigest, type DigestDeal } from "../../../lib/digest";
import type { MatchProfile } from "../../../lib/match";

export const runtime = "nodejs";
export const maxDuration = 60;
export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://raiseradar-woad.vercel.app";
const MAX_EMAILS_PER_RUN = 50;

function authorised(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const given = Buffer.from(req.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

async function sendEmail(to: string, unsubscribeUrl: string, subject: string, html: string, text: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${process.env.RESEND_API_KEY}`, "content-type": "application/json" },
    body: JSON.stringify({
      from: process.env.DIGEST_FROM_EMAIL,
      to: [to],
      subject,
      html,
      text,
      headers: { "List-Unsubscribe": `<${unsubscribeUrl}>`, "List-Unsubscribe-Post": "List-Unsubscribe=One-Click" },
    }),
  });
  if (!res.ok) throw new Error(`resend ${res.status}`);
}

export async function GET(req: Request) {
  if (!authorised(req)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  if (!process.env.RESEND_API_KEY || !process.env.DIGEST_FROM_EMAIL) {
    return NextResponse.json({ error: "RESEND_API_KEY and DIGEST_FROM_EMAIL are not set. No emails were sent." }, { status: 400 });
  }

  const db = supabaseService();
  const report = { subscribers: 0, due: 0, sent: 0, skippedNoMatch: 0, errors: 0 };

  const { data: subs, error } = await db
    .from("alert_subscriptions")
    .select("user_id,frequency,min_score,last_sent_at,unsubscribe_token")
    .eq("active", true);
  if (error) return NextResponse.json({ error: "could not load subscriptions" }, { status: 500 });
  report.subscribers = subs?.length ?? 0;

  const due = (subs ?? []).filter((s) => dueNow(s.frequency, s.last_sent_at)).slice(0, MAX_EMAILS_PER_RUN);
  report.due = due.length;
  if (due.length === 0) return NextResponse.json(report);

  const { data: dealRows } = await db
    .from("deals")
    .select("id,company,amount_value,currency,amount_raw,stage,sector,city,announced_date,use_of_funds,founder_name,hiring,is_sample,created_at")
    .eq("reviewed", true)
    .eq("is_sample", false)
    .order("created_at", { ascending: false })
    .limit(500);
  const deals = (dealRows ?? []) as DigestDeal[];

  for (const s of due) {
    try {
      const [{ data: profile }, { data: u }] = await Promise.all([
        db.from("profiles").select("audience,roles,skills,cities,sectors,stages").eq("user_id", s.user_id).maybeSingle(),
        db.auth.admin.getUserById(s.user_id),
      ]);
      const email = u?.user?.email;
      if (!profile || !email) continue;
      const items = pickForDigest(profile as MatchProfile, deals, s.min_score, s.last_sent_at);
      if (items.length === 0) {
        report.skippedNoMatch += 1;
        continue; // last_sent_at stays, so the next run still counts new deals since then
      }
      const unsubscribeUrl = `${SITE_URL}/unsubscribe?t=${s.unsubscribe_token}`;
      const mail = renderDigest({ siteUrl: SITE_URL, unsubscribeUrl, items });
      await sendEmail(email, `${SITE_URL}/api/unsubscribe?t=${s.unsubscribe_token}`, mail.subject, mail.html, mail.text);
      await db.from("alert_subscriptions").update({ last_sent_at: new Date().toISOString() }).eq("user_id", s.user_id);
      report.sent += 1;
    } catch {
      report.errors += 1;
    }
  }
  return NextResponse.json(report);
}
