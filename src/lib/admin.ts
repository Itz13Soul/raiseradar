import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "rr_admin";
const MIN_LENGTH = 16;

function configured(): string | null {
  const pw = process.env.ADMIN_PASSWORD;
  return pw && pw.length >= MIN_LENGTH ? pw : null;
}

function digest(value: string, key: string): Buffer {
  return Buffer.from(createHmac("sha256", key).update(value).digest("hex"));
}

export function adminConfigured(): boolean {
  return configured() !== null;
}

export function passwordMatches(input: string): boolean {
  const pw = configured();
  if (!pw) return false;
  return timingSafeEqual(digest(input, "login"), digest(pw, "login"));
}

function sessionToken(): Buffer | null {
  const pw = configured();
  return pw ? digest("raiseradar-admin-session", pw) : null;
}

export async function grantAdmin(): Promise<boolean> {
  const token = sessionToken();
  if (!token) return false;
  (await cookies()).set(COOKIE, token.toString(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  return true;
}

export async function isAdmin(): Promise<boolean> {
  const token = sessionToken();
  if (!token) return false;
  const given = (await cookies()).get(COOKIE)?.value;
  if (!given) return false;
  const a = Buffer.from(given);
  return a.length === token.length && timingSafeEqual(a, token);
}
