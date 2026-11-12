import type { SupabaseClient } from "@supabase/supabase-js";
import type { Hiring } from "./schema";
import type { Profile } from "./profile";

export type DealLite = {
  id: string;
  company: string;
  amount_value: number | null;
  currency: string | null;
  amount_raw: string | null;
  stage: string | null;
  sector: string | null;
  city: string | null;
  announced_date: string | null;
  use_of_funds: string | null;
  founder_name: string | null;
  hiring: Hiring | null;
  is_sample: boolean;
};

const COLS = "id,company,amount_value,currency,amount_raw,stage,sector,city,announced_date,use_of_funds,founder_name,hiring,is_sample";

export async function loadDeals(db: SupabaseClient): Promise<DealLite[]> {
  const { data, error } = await db
    .from("deals")
    .select(COLS)
    .order("announced_date", { ascending: false, nullsFirst: false })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []) as DealLite[];
}

export async function loadProfile(db: SupabaseClient, userId: string): Promise<Profile | null> {
  const { data, error } = await db.from("profiles").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Profile | null) ?? null;
}

export function money(d: Pick<DealLite, "amount_raw" | "amount_value" | "currency">): string {
  if (d.amount_raw) return d.amount_raw;
  if (d.amount_value == null) return "Undisclosed";
  return `${d.currency ?? ""} ${d.amount_value.toLocaleString("en-IN")}`.trim();
}
