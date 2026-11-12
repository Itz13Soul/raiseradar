import "server-only";
import type { User } from "@supabase/supabase-js";
import { supabaseService } from "./supabase";

// Verifies the Supabase access token sent by the browser as "Authorization: Bearer <jwt>".
export async function userFromRequest(req: Request): Promise<User | null> {
  const h = req.headers.get("authorization") ?? "";
  const token = h.startsWith("Bearer ") ? h.slice(7).trim() : "";
  if (!token) return null;
  try {
    const { data, error } = await supabaseService().auth.getUser(token);
    return error ? null : data.user;
  } catch {
    return null;
  }
}
