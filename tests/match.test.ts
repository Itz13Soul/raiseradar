import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { scoreDeal, tokens, type MatchDeal, type MatchProfile } from "../src/lib/match";
import { evaluate, type MatchFixture } from "../src/lib/match-eval";
import { dueNow, escapeHtml } from "../src/lib/digest";
import { parseList } from "../src/lib/profile";

const NOW = Date.parse("2026-11-12");
const deal: MatchDeal = {
  company: "Acme", amount_value: 20_000_000, currency: "USD", stage: "Seed", sector: "fintech", city: "Bengaluru",
  announced_date: "2026-11-05", use_of_funds: "Growing engineering and payments teams.",
  hiring: { roles: [{ role: "Backend Engineer", reason: "engineering", confidence: "high" }] },
};
const empty: MatchProfile = { audience: "job_seeker", roles: [], skills: [], cities: [], sectors: [], stages: [] };

describe("match", () => {
  it("stems engineer forms together", () => {
    assert.deepEqual([...tokens("engineering")], [...tokens("Engineers")]);
  });
  it("scores a role and city match above a mismatch", () => {
    const good = scoreDeal({ ...empty, roles: ["backend engineer"], cities: ["Bengaluru"] }, deal, NOW);
    const bad = scoreDeal({ ...empty, roles: ["chef"], cities: ["Delhi"] }, deal, NOW);
    assert.ok(good.score > 80, `good=${good.score}`);
    assert.ok(bad.score < 20, `bad=${bad.score}`);
    assert.ok(good.reasons.some((r) => r.startsWith("Predicted role match")));
  });
  it("an empty profile never counts against a deal", () => {
    const r = scoreDeal(empty, deal, NOW);
    assert.ok(r.score >= 0 && r.score <= 100);
  });
  it("low confidence roles score below high confidence", () => {
    const low = { ...deal, hiring: { roles: [{ role: "Backend Engineer", reason: "", confidence: "low" as const }] } };
    const p = { ...empty, roles: ["backend engineer"] };
    assert.ok(scoreDeal(p, low, NOW).score < scoreDeal(p, deal, NOW).score);
  });
  it("sales profile matches needs in use of funds", () => {
    const p: MatchProfile = { ...empty, audience: "sales", skills: ["payments"] };
    assert.ok(scoreDeal(p, deal, NOW).reasons.some((r) => r.includes("payments")));
  });
  it("scores stay within 0 to 100", () => {
    for (const a of ["job_seeker", "sales", "recruiter"] as const) {
      const s = scoreDeal({ audience: a, roles: ["backend engineer"], skills: ["payments"], cities: ["Bengaluru"], sectors: ["fintech"], stages: ["Seed"] }, deal, NOW).score;
      assert.ok(s >= 0 && s <= 100);
    }
  });
});

describe("labelled match eval", () => {
  const fx = JSON.parse(readFileSync("eval/match-labelled.json", "utf8")) as MatchFixture;
  it("beats the recency baseline by a wide margin and holds a floor", () => {
    const m = evaluate(fx, "match");
    const b = evaluate(fx, "recency");
    assert.ok(m.map > b.map + 0.3, `map ${m.map} vs baseline ${b.map}`);
    assert.ok(m.map >= 0.75, `map ${m.map}`);
  });
});

describe("digest and profile helpers", () => {
  it("decides when a digest is due", () => {
    const now = Date.parse("2026-11-12T04:00:00Z");
    assert.equal(dueNow("weekly", null, now), true);
    assert.equal(dueNow("daily", "2026-11-11T04:00:00Z", now), true);
    assert.equal(dueNow("daily", "2026-11-12T01:00:00Z", now), false);
    assert.equal(dueNow("weekly", "2026-11-08T04:00:00Z", now), false);
    assert.equal(dueNow("weekly", "2026-11-05T04:00:00Z", now), true);
  });
  it("escapes html in emails", () => {
    assert.equal(escapeHtml(`<a href="x">&</a>`), "&lt;a href=&quot;x&quot;&gt;&amp;&lt;/a&gt;");
  });
  it("parses and caps comma lists", () => {
    assert.deepEqual(parseList("A, a, B,\nC", 3), ["A", "B", "C"]);
    assert.equal(parseList("a,b,c,d", 2).length, 2);
  });
});

import { groupDeals } from "../src/lib/group";
import { slugify, jsonLd } from "../src/lib/seo";

describe("seo helpers", () => {
  const fx = JSON.parse(readFileSync("eval/match-labelled.json", "utf8")) as { deals: Record<string, unknown>[] };
  const deals = fx.deals.map((d, i) => ({ ...d, id: String(i), created_at: "2026-11-01" })) as never[];
  it("only builds pages for groups with at least 3 deals", () => {
    for (const k of ["city", "sector"] as const) for (const g of groupDeals(deals, k)) assert.ok(g.deals.length >= 3);
    assert.ok(groupDeals(deals, "city").some((g) => g.slug === "bengaluru"));
  });
  it("slugifies and escapes json-ld", () => {
    assert.equal(slugify("Food & Beverage"), "food-and-beverage");
    assert.ok(!jsonLd({ a: "</script><b>" }).includes("<"));
  });
});
