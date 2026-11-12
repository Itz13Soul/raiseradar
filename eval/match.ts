import { readFileSync, writeFileSync } from "node:fs";
import { evaluate, type MatchFixture } from "../src/lib/match-eval";

const fx: MatchFixture = JSON.parse(readFileSync("eval/match-labelled.json", "utf8"));
const m = evaluate(fx, "match");
const b = evaluate(fx, "recency");
const pct = (x: number) => (x * 100).toFixed(1) + "%";

console.log(`Labelled profiles: ${fx.profiles.length}, deals in pool: ${fx.deals.length}`);
console.log("profile".padEnd(14), "rel", "R-prec", "AP", "recall@10");
for (const p of m.per) console.log(p.id.padEnd(14), String(p.relevant).padStart(3), pct(p.rPrecision).padStart(7), pct(p.averagePrecision).padStart(6), pct(p.recallAt10).padStart(8));
console.log(`\nMatch engine : R-precision ${pct(m.rPrecision)}, MAP ${pct(m.map)}, recall@10 ${pct(m.recallAt10)}`);
console.log(`Recency only : R-precision ${pct(b.rPrecision)}, MAP ${pct(b.map)}, recall@10 ${pct(b.recallAt10)} (baseline: newest first, ignores the profile)`);

writeFileSync(
  "eval/match-results.json",
  JSON.stringify({ ran_on: new Date().toISOString().slice(0, 10), profiles: fx.profiles.length, deals: fx.deals.length, match: { rPrecision: m.rPrecision, map: m.map, recallAt10: m.recallAt10 }, baseline_recency: { rPrecision: b.rPrecision, map: b.map, recallAt10: b.recallAt10 }, per_profile: m.per }, null, 2) + "\n",
);
