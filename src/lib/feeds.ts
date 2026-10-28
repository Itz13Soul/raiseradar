import { XMLParser } from "fast-xml-parser";

export type FeedItem = {
  title: string;
  link: string;
  publishedAt?: string;
  snippet: string;
  sourceName: string;
};

const parser = new XMLParser({ ignoreAttributes: false, textNodeName: "#text" });

function text(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object" && "#text" in (v as any)) return String((v as any)["#text"]);
  return String(v);
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

export async function fetchFeed(url: string): Promise<FeedItem[]> {
  const res = await fetch(url, {
    headers: { "user-agent": "RaiseRadarBot/0.1 (personal portfolio project; respects feed terms)" },
  });
  if (!res.ok) throw new Error(`Feed ${url} returned HTTP ${res.status}`);
  const xml = parser.parse(await res.text());

  const channel = xml?.rss?.channel;
  if (channel) {
    const sourceName = stripHtml(text(channel.title)) || new URL(url).hostname;
    const items = Array.isArray(channel.item) ? channel.item : channel.item ? [channel.item] : [];
    return items.map((i: any) => ({
      title: stripHtml(text(i.title)),
      link: text(i.link).trim(),
      publishedAt: i.pubDate ? new Date(text(i.pubDate)).toISOString().slice(0, 10) : undefined,
      snippet: stripHtml(text(i.description)).slice(0, 1200),
      sourceName,
    }));
  }

  const feed = xml?.feed;
  if (feed) {
    const sourceName = stripHtml(text(feed.title)) || new URL(url).hostname;
    const entries = Array.isArray(feed.entry) ? feed.entry : feed.entry ? [feed.entry] : [];
    return entries.map((e: any) => {
      const links = Array.isArray(e.link) ? e.link : [e.link];
      const href = links.find((l: any) => l?.["@_rel"] === "alternate")?.["@_href"] ?? links[0]?.["@_href"] ?? "";
      const when = text(e.published) || text(e.updated);
      return {
        title: stripHtml(text(e.title)),
        link: String(href).trim(),
        publishedAt: when ? new Date(when).toISOString().slice(0, 10) : undefined,
        snippet: stripHtml(text(e.summary) || text(e.content)).slice(0, 1200),
        sourceName,
      };
    });
  }

  throw new Error(`Unrecognised feed format at ${url}`);
}
