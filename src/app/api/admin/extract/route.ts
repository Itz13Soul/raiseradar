import { NextResponse } from "next/server";
import { z } from "zod";
import { isAdmin } from "../../../../lib/admin";
import { extractDeal } from "../../../../lib/extract";

export const maxDuration = 60;

const Body = z.object({
  title: z.string().trim().min(3).max(300),
  text: z.string().trim().min(20).max(6000),
  publishedAt: z.string().trim().max(20).optional(),
});

export async function POST(req: Request) {
  if (!(await isAdmin())) return NextResponse.json({ error: "Unauthorised." }, { status: 401 });
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Provide a headline and the article text." }, { status: 400 });
  try {
    const extraction = await extractDeal({
      title: parsed.data.title,
      snippet: parsed.data.text,
      publishedAt: parsed.data.publishedAt || undefined,
    });
    return NextResponse.json({ extraction });
  } catch (e) {
    return NextResponse.json({ error: String(e).slice(0, 300) }, { status: 502 });
  }
}
