import { test } from "node:test";
import assert from "node:assert/strict";
import { parseFeed } from "../src/lib/feeds";
import { companyKey, isHttpUrl } from "../src/lib/schema";

const SAMPLE_RSS = `<?xml version="1.0"?>
<rss version="2.0"><channel><title>Sample Feed</title>
<item><title>Sample Co raises seed round</title><link>https://example.com/a</link>
<pubDate>Tue, 20 Oct 2026 08:00:00 GMT</pubDate>
<description>&lt;p&gt;Sample text&lt;/p&gt;</description></item>
</channel></rss>`;

const SAMPLE_ATOM = `<?xml version="1.0"?>
<feed xmlns="http://www.w3.org/2005/Atom"><title>Sample Atom</title>
<entry><title>Another Co funding</title>
<link rel="alternate" href="https://example.com/b"/>
<updated>2026-10-21T10:00:00Z</updated><summary>Short summary</summary></entry>
</feed>`;

test("parses RSS items and strips html", () => {
  const items = parseFeed(SAMPLE_RSS, "https://example.com/feed");
  assert.equal(items.length, 1);
  assert.equal(items[0].title, "Sample Co raises seed round");
  assert.equal(items[0].link, "https://example.com/a");
  assert.equal(items[0].publishedAt, "2026-10-20");
  assert.equal(items[0].snippet, "Sample text");
  assert.equal(items[0].sourceName, "Sample Feed");
});

test("parses Atom entries", () => {
  const items = parseFeed(SAMPLE_ATOM, "https://example.com/atom");
  assert.equal(items.length, 1);
  assert.equal(items[0].link, "https://example.com/b");
  assert.equal(items[0].publishedAt, "2026-10-21");
});

test("rejects unknown formats", () => {
  assert.throws(() => parseFeed("<html></html>", "https://example.com/x"));
});

test("only http and https links are accepted", () => {
  assert.equal(isHttpUrl("https://example.com/a"), true);
  assert.equal(isHttpUrl("http://example.com/a"), true);
  assert.equal(isHttpUrl("javascript:alert(1)"), false);
  assert.equal(isHttpUrl("not a url"), false);
});

test("company key ignores case and punctuation", () => {
  assert.equal(companyKey("Zepto Pvt. Ltd."), companyKey("zepto pvt ltd"));
});

test("city vectors lie on the unit sphere and unknown cities are skipped", async () => {
  const { cityToVector } = await import("../src/lib/cities");
  const v = cityToVector("Bengaluru");
  assert.ok(v);
  assert.ok(Math.abs(Math.hypot(...v) - 1) < 1e-9);
  assert.ok(Math.abs(v[1] - Math.sin((12.9716 * Math.PI) / 180)) < 1e-9);
  assert.equal(cityToVector("Atlantis"), null);
});
