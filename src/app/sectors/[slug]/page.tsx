import { notFound } from "next/navigation";
import type { Metadata } from "next";
import GroupPage from "../../../components/GroupPage";
import { groupDeals, loadAllDeals } from "../../../lib/seo-data";
import { SITE_URL, trimTo } from "../../../lib/seo";

export const revalidate = 600;

async function find(slug: string) {
  const groups = groupDeals(await loadAllDeals(), "sector");
  const group = groups.find((g) => g.slug === slug);
  return { group, others: groups.filter((g) => g.slug !== slug).slice(0, 12) };
}

export async function generateMetadata({ params }: PageProps<"/sectors/[slug]">): Promise<Metadata> {
  const { group } = await find((await params).slug);
  if (!group) return { title: "Not found", robots: { index: false } };
  const title = `${group.label} startups funding rounds and likely hiring roles`;
  const description = trimTo(`${group.deals.length} reviewed funding rounds in ${group.label}, with the roles each startup is likely to hire next and a suggested outreach note.`, 158);
  const url = `/sectors/${group.slug}`;
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url: `${SITE_URL}${url}`, type: "website" } };
}

export default async function Page({ params }: PageProps<"/sectors/[slug]">) {
  const { group, others } = await find((await params).slug);
  if (!group) notFound();
  return <GroupPage kind="sector" group={group} others={others} />;
}
