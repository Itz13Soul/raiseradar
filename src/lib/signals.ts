import { llmJson } from "./llm";
import { HiringSchema, type Extraction, type Hiring } from "./schema";

const SYSTEM = `You are a hiring-signal analyst for Indian startups. Given facts about ONE funding round, predict which roles the company is likely to hire for next.
Rules:
- Base every role on the stated stage, sector or use of funds. Each "reason" must name which of those it relies on. Do not invent facts about the company.
- These are predictions, not confirmed openings. Use confidence "high" only when the use of funds explicitly names the function (e.g. "expand engineering team"). Otherwise "medium" or "low".
- Return at most 5 roles, most likely first.
- outreach_note: exactly three short lines, plain text, separated by newline characters. Line 1: a specific, factual congratulation referencing the round. Line 2: one concrete way the sender could help, tied to a predicted role. Line 3: a low-pressure ask for a short call. No flattery, no invented claims about the sender beyond the sender pitch provided.
- best_channel: one of email, linkedin, x, warm_intro. channel_reason: one sentence. This is a suggestion, not a fact.
Return one JSON object with keys: roles (array of {role, reason, confidence}), outreach_note, best_channel, channel_reason.`;

export async function hiringSignals(deal: Extraction): Promise<Hiring> {
  const facts = {
    company: deal.company,
    stage: deal.stage,
    sector: deal.sector,
    city: deal.city,
    amount_raw: deal.amount_raw,
    investors: deal.investors,
    use_of_funds: deal.use_of_funds,
    founder_name: deal.founder_name,
  };
  const pitch = process.env.OUTREACH_SENDER_PITCH?.trim() || "a candidate or vendor who wants to help the company grow";
  const user = `Sender pitch: ${pitch}\nFunding facts (JSON): ${JSON.stringify(facts)}`;
  return llmJson(HiringSchema, { system: SYSTEM, user });
}

export function founderSearchUrl(company: string, founder?: string | null): string {
  const q = founder ? `${founder} ${company} LinkedIn` : `${company} founder LinkedIn`;
  return `https://www.google.com/search?q=${encodeURIComponent(q)}`;
}
