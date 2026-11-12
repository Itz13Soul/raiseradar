import { rankDeals, type MatchProfile } from "./match";
import type { DealLite } from "./client-data";
import { money } from "./client-data";

export function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export function dueNow(frequency: "daily" | "weekly", lastSentAt: string | null, now = Date.now()): boolean {
  if (!lastSentAt) return true;
  const hours = (now - Date.parse(lastSentAt)) / 3600_000;
  // Small slack so a cron that fires a few minutes early still counts.
  return hours >= (frequency === "daily" ? 23 : 24 * 7 - 1);
}

export type DigestDeal = DealLite & { created_at: string };

// Only deals added since the last digest (first digest: the last 14 days), ranked by match score.
export function pickForDigest(profile: MatchProfile, deals: DigestDeal[], minScore: number, lastSentAt: string | null, now = Date.now()) {
  const sinceMs = lastSentAt ? Date.parse(lastSentAt) : now - 14 * 86400_000;
  const fresh = deals.filter((d) => Date.parse(d.created_at) > sinceMs);
  return rankDeals(profile, fresh, now)
    .filter((d) => d.score >= minScore)
    .slice(0, 10);
}

export function renderDigest(opts: { siteUrl: string; unsubscribeUrl: string; items: ReturnType<typeof pickForDigest> }): { subject: string; html: string; text: string } {
  const { siteUrl, unsubscribeUrl, items } = opts;
  const subject = `RaiseRadar: ${items.length} funded ${items.length === 1 ? "company matches" : "companies match"} your profile`;
  const rows = items
    .map(
      (d) =>
        `<tr><td style="padding:12px 0;border-bottom:1px solid #e5e7eb"><a href="${siteUrl}/deal/${d.id}" style="font-weight:600;color:#0e7490;text-decoration:none">${escapeHtml(d.company)}</a> <span style="color:#6b7280">· match ${d.score}</span><br><span style="color:#374151;font-size:14px">${escapeHtml([money(d), d.stage, d.sector, d.city].filter(Boolean).join(" · "))}</span>${d.reasons.length ? `<br><span style="color:#6b7280;font-size:13px">${escapeHtml(d.reasons.slice(0, 3).join(" · "))}</span>` : ""}</td></tr>`,
    )
    .join("");
  const html = `<!doctype html><html><body style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:16px;color:#111827"><h2 style="margin:0 0 4px">Your RaiseRadar digest</h2><p style="margin:0 0 12px;color:#6b7280;font-size:14px">Funded companies ranked against your profile. Predicted roles are probability, not proof.</p><table style="width:100%;border-collapse:collapse">${rows}</table><p style="margin-top:20px;font-size:13px"><a href="${siteUrl}/my">Open My radar</a></p><p style="margin-top:24px;font-size:12px;color:#6b7280">You get this because you turned on alerts at RaiseRadar. <a href="${unsubscribeUrl}">Unsubscribe in one click</a>.</p></body></html>`;
  const text = [
    "Your RaiseRadar digest",
    "",
    ...items.map((d) => `- ${d.company} (match ${d.score}): ${[money(d), d.stage, d.sector, d.city].filter(Boolean).join(" · ")}\n  ${siteUrl}/deal/${d.id}`),
    "",
    `Open My radar: ${siteUrl}/my`,
    `Unsubscribe: ${unsubscribeUrl}`,
  ].join("\n");
  return { subject, html, text };
}
