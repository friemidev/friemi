import { NextResponse } from "next/server";
import { z } from "zod";
import { listDrawGuessWordBanks } from "@/features/game-tools/drawGuessWordBanks";

export async function GET(request: Request) {
  const locale = z.enum(["zh-CN", "en", "fr"]).safeParse(new URL(request.url).searchParams.get("locale"));
  if (!locale.success) return NextResponse.json({ error: "INVALID_LOCALE" }, { status: 400 });
  const wordBanks = await listDrawGuessWordBanks(locale.data);
  return NextResponse.json({ wordBanks }, { headers: { "cache-control": "public, max-age=60" } });
}
