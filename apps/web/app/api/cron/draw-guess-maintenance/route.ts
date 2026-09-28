import { NextResponse } from "next/server";
import { maintainDrawGuessData } from "@/features/game-tools/drawGuessMaintenance";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "UNAUTHORIZED" }, { status: 401 });
  }
  return NextResponse.json(await maintainDrawGuessData(), { headers: { "cache-control": "no-store" } });
}
