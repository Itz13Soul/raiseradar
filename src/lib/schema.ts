import { z } from "zod";

export const STAGES = [
  "Pre-Seed",
  "Seed",
  "Pre-Series A",
  "Series A",
  "Series B",
  "Series C",
  "Series D+",
  "Growth",
  "Debt",
  "Grant",
  "Other",
] as const;

export const ExtractionSchema = z.object({
  is_funding_round: z.boolean(),
  company: z.string().nullable(),
  amount_value: z.number().nullable(),
  currency: z.enum(["USD", "INR", "OTHER"]).nullable(),
  amount_raw: z.string().nullable(),
  stage: z.enum(STAGES).nullable(),
  investors: z.array(z.string()),
  sector: z.string().nullable(),
  city: z.string().nullable(),
  announced_date: z.string().nullable(),
  use_of_funds: z.string().nullable(),
  founder_name: z.string().nullable(),
});
export type Extraction = z.infer<typeof ExtractionSchema>;

export const HiringSchema = z.object({
  roles: z
    .array(
      z.object({
        role: z.string(),
        reason: z.string(),
        confidence: z.enum(["low", "medium", "high"]),
      }),
    )
    .max(5),
  outreach_note: z.string(),
  best_channel: z.enum(["email", "linkedin", "x", "warm_intro"]),
  channel_reason: z.string(),
});
export type Hiring = z.infer<typeof HiringSchema>;

export type DealRow = {
  id: string;
  company: string;
  amount_value: number | null;
  currency: string | null;
  amount_raw: string | null;
  stage: string | null;
  investors: string[];
  sector: string | null;
  city: string | null;
  announced_date: string | null;
  use_of_funds: string | null;
  founder_name: string | null;
  source_url: string;
  source_name: string;
  hiring: Hiring | null;
  is_sample: boolean;
  reviewed: boolean;
  raw_extraction: Extraction | null;
  created_at: string;
};

export function companyKey(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
}

export function isHttpUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}
