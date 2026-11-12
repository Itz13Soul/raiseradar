import { supabaseAnon } from "./supabase";
import type { DealRow } from "./schema";

export { groupDeals, MIN_GROUP, type Group } from "./group";

export async function loadAllDeals(): Promise<DealRow[]> {
  const db = supabaseAnon();
  if (!db) return [];
  const { data } = await db
    .from("deals")
    .select("*")
    .order("announced_date", { ascending: false, nullsFirst: false })
    .limit(1000);
  return (data ?? []) as DealRow[];
}
