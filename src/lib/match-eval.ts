import { rankDeals, type MatchDeal, type MatchProfile } from "./match";

export type MatchFixture = {
  as_of: string;
  deals: MatchDeal[];
  profiles: { id: string; description: string; profile: MatchProfile; relevant: string[] }[];
};

export type ProfileScore = { id: string; relevant: number; rPrecision: number; averagePrecision: number; recallAt10: number };

function metrics(rankedNames: string[], relevant: Set<string>): Omit<ProfileScore, "id"> {
  const r = relevant.size;
  let hits = 0;
  let ap = 0;
  rankedNames.forEach((n, i) => {
    if (relevant.has(n)) {
      hits += 1;
      ap += hits / (i + 1);
    }
  });
  const topR = rankedNames.slice(0, r).filter((n) => relevant.has(n)).length;
  const top10 = rankedNames.slice(0, 10).filter((n) => relevant.has(n)).length;
  return { relevant: r, rPrecision: topR / r, averagePrecision: ap / r, recallAt10: top10 / Math.min(r, 10) };
}

export function evaluate(fx: MatchFixture, rank: "match" | "recency" = "match") {
  const now = Date.parse(fx.as_of);
  const per: ProfileScore[] = fx.profiles.map((p) => {
    const ordered =
      rank === "match"
        ? rankDeals(p.profile, fx.deals, now)
        : [...fx.deals].sort((a, b) => (b.announced_date ?? "").localeCompare(a.announced_date ?? ""));
    return { id: p.id, ...metrics(ordered.map((d) => d.company), new Set(p.relevant)) };
  });
  const mean = (k: keyof Omit<ProfileScore, "id">) => per.reduce((a, s) => a + s[k], 0) / per.length;
  return { per, rPrecision: mean("rPrecision"), map: mean("averagePrecision"), recallAt10: mean("recallAt10") };
}
