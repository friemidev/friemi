import { NextResponse } from "next/server";
import { isDrawGuessChainEnabled, isDrawGuessClassicEnabled } from "@/features/game-tools/drawGuessFlags";
import { requireAdminApiAccess } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const authError = await requireAdminApiAccess();
  if (authError) return authError;
  const [activeRooms, overdueRooms, openReports, recentAdvances] = await Promise.all([
    prisma.gameToolRoom.count({ where: { kind: "DRAW_GUESS", status: "IN_PROGRESS" } }),
    prisma.gameToolRoom.count({ where: { kind: "DRAW_GUESS", status: "IN_PROGRESS", drawGuessDeadlineAt: { lt: new Date(Date.now() - 30_000) } } }),
    prisma.drawGuessReport.count({ where: { status: "OPEN" } }),
    prisma.gameToolEvent.count({ where: { type: "DRAW_GUESS_PHASE_ADVANCED", createdAt: { gte: new Date(Date.now() - 3_600_000) } } }),
  ]);
  return NextResponse.json({
    activeRooms,
    overdueRooms,
    openReports,
    recentAdvances,
    chainEnabled: isDrawGuessChainEnabled(),
    classicEnabled: isDrawGuessClassicEnabled(),
    realtimeBrowserConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)),
    realtimeServerConfigured: Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)),
  }, { headers: { "cache-control": "private, no-store" } });
}
