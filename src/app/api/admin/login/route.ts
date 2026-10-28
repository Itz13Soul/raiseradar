import { NextResponse } from "next/server";
import { adminConfigured, grantAdmin, passwordMatches } from "../../../../lib/admin";

export async function POST(req: Request) {
  if (!adminConfigured()) {
    return NextResponse.json({ error: "Admin access is not configured." }, { status: 503 });
  }
  let password = "";
  try {
    const body = (await req.json()) as { password?: unknown };
    password = typeof body.password === "string" ? body.password : "";
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!passwordMatches(password)) {
    await new Promise((r) => setTimeout(r, 900));
    return NextResponse.json({ error: "Incorrect password." }, { status: 401 });
  }
  await grantAdmin();
  return NextResponse.json({ ok: true });
}
