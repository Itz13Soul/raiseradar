import { llmJson } from "./llm";
import { ExtractionSchema, STAGES, type Extraction } from "./schema";

const SYSTEM = `You extract structured facts about startup funding rounds from a short news item.
Rules:
- Use ONLY information present in the text. If a field is not stated, return null (investors: empty array).
- is_funding_round is true only if the item reports a company raising money (equity, debt or grant). Otherwise false and all other fields null/empty.
- amount_value is the full number as stated, no currency conversion. Examples: "$5 million" -> 5000000 with currency USD; "Rs 40 crore" or "INR 40 crore" -> 400000000 with currency INR (1 crore = 10,000,000; 1 lakh = 100,000). If the amount is undisclosed, null.
- amount_raw is the amount exactly as written in the text.
- stage must be one of: ${STAGES.join(", ")}. Use "Other" if a round is reported but fits none.
- city is the company's headquarters city if stated, else null.
- announced_date is YYYY-MM-DD, taken from the text or the provided publish date. null if neither is available.
- use_of_funds: the stated use of the money, in under 25 words, or null.
- founder_name: only if a founder or CEO is named in the text.
Return one JSON object with exactly these keys: is_funding_round, company, amount_value, currency, amount_raw, stage, investors, sector, city, announced_date, use_of_funds, founder_name.`;

export async function extractDeal(input: { title: string; snippet: string; publishedAt?: string }): Promise<Extraction> {
  const user = `Publish date: ${input.publishedAt ?? "unknown"}\nTitle: ${input.title}\nText: ${input.snippet}`;
  return llmJson(ExtractionSchema, { system: SYSTEM, user });
}
