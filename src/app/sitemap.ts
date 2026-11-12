import type { MetadataRoute } from "next";
import { SITE_URL } from "../lib/seo";
import { groupDeals, loadAllDeals } from "../lib/seo-data";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const deals = await loadAllDeals();
  const stamp = (d: string | null | undefined) => (d ? new Date(d) : new Date());
  const newest = deals.map((d) => d.created_at).sort().pop();

  const fixed: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: stamp(newest), changeFrequency: "daily", priority: 1 },
    { url: `${SITE_URL}/deals`, lastModified: stamp(newest), changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/insights`, lastModified: stamp(newest), changeFrequency: "weekly", priority: 0.6 },
    { url: `${SITE_URL}/privacy`, changeFrequency: "yearly", priority: 0.2 },
  ];
  const cities = groupDeals(deals, "city").map((g) => ({
    url: `${SITE_URL}/cities/${g.slug}`,
    lastModified: stamp(g.deals.map((d) => d.created_at).sort().pop()),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));
  const sectors = groupDeals(deals, "sector").map((g) => ({
    url: `${SITE_URL}/sectors/${g.slug}`,
    lastModified: stamp(g.deals.map((d) => d.created_at).sort().pop()),
    changeFrequency: "weekly" as const,
    priority: 0.8,
  }));
  const dealPages = deals.map((d) => ({
    url: `${SITE_URL}/deal/${d.id}`,
    lastModified: stamp(d.created_at),
    changeFrequency: "monthly" as const,
    priority: 0.6,
  }));
  return [...fixed, ...cities, ...sectors, ...dealPages];
}
