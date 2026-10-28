import { XMLParser } from "fast-xml-parser";

export type FeedItem = {
  title: string;
  link: string;
  publishedAt?: string;
  snippet: string;
  sourceName: string;
};

const parser = new XMLParser({ ignoreAttributes: false, textNodeName: "#text" });

type XmlNode = Record<string, unknown>;

function asNodes(v: unknown): XmlNode[] {
  if (Array.isArray(v)) return v.filter((x): x is XmlNode => typeof x === "object" && x !== null);
  return typeof v === "object" && v !== null ? [v as XmlNode] : [];
}

function text(v: unknown): string {
  if (v == null) return "";
  if (typeof v === "string") return v;
  if (typeof v === "object" && "#text" in v) return String((v as XmlNode)["#text"]);
  return String(v);
}

function stripHtml(s: string): string {
  return s.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
}

export async function fetchFeed(url: string): Promise<FeedItem[]> {
  const res = await fetch(url, {
    headers: { "user-agent": "RaiseRadarBot/0.1 (personal portfolio project; respects feed terms)" },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`Feed ${url} returned HTTP ${res.status}`);
  return parseFeed(await res.text(), url);
}

export function parseFeed(raw: string, url: string): FeedItem[] {
  const xml = parser.parse(raw);

  const channel = xml?.rss?.channel as XmlNode | undefined;
  if (channel) {
    const sourceName = stripHtml(text(channel.title)) || new URL(url).hostname;
    return asNodes(channel.item).map((i) => ({
      title: stripHtml(text(i.title)),
      link: text(i.link).trim(),
      publishedAt: i.pubDate ? new Date(text(i.pubDate)).toISOString().slice(0, 10) : undefined,
      snippet: stripHtml(text(i.description)).slice(0, 1200),
      sourceName,
    }));
  }

  const feed = xml?.feed as XmlNode | undefined;
  if (feed) {
    const sourceName = stripHtml(text(feed.title)) || new URL(url).hostname;
    return asNodes(feed.entry).map((e) => {
      const links = asNodes(e.link);
      const href = links.find((l) => l["@_rel"] === "alternate")?.["@_href"] ?? links[0]?.["@_href"] ?? "";
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
