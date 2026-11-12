import { tokens } from "./match";

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9+#]+/g, " ").trim();

// True only if the phrase is really in the source text: exact phrase, or every meaningful word of it appears.
export function grounded(phrase: string, source: string): boolean {
  const p = norm(phrase);
  if (!p) return false;
  const s = ` ${norm(source)} `;
  if (s.includes(` ${p} `)) return true;
  const src = tokens(source);
  const t = [...tokens(phrase)];
  return t.length > 0 && t.every((x) => src.has(x));
}

export function keepGrounded(items: string[], source: string): string[] {
  return items.filter((i) => grounded(i, source));
}

export function cleanItems(items: string[], max: number): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of items) {
    const v = raw.trim().replace(/\s+/g, " ").slice(0, 60);
    const k = v.toLowerCase();
    if (v && !seen.has(k)) {
      seen.add(k);
      out.push(v);
    }
    if (out.length >= max) break;
  }
  return out;
}
