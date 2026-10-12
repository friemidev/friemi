import { NextResponse } from "next/server";
import { z } from "zod";
import { isDicePreviewEnabled } from "@/features/game-tools/diceAvailability";
import { guardDiceWrite } from "@/features/game-tools/diceRoomWriteGuard";
import { createDiceRoom, joinDiceRoom } from "@/features/game-tools/diceRoomServer";
import { getOptionalCurrentUserProfile } from "@/lib/auth";

const createSchema = z.object({ locale: z.enum(["zh-CN", "en", "fr"]), maxPlayers: z.number().int().min(2).max(6) });
const joinSchema = z.object({ code: z.string().regex(/^[A-Za-z0-9]{6,8}$/) });
export async function POST(request: Request) {
  if (!isDicePreviewEnabled()) return NextResponse.json({ error: "ROOM_NOT_FOUND" }, { status: 404 });
  const originGuard = await guardDiceWrite(request, "origin");
  if (originGuard) return originGuard;
  const profile = await getOptionalCurrentUserProfile();
  if (!profile) return NextResponse.json({ error: "SIGN_IN_REQUIRED" }, { status: 401 });
  const limited = await guardDiceWrite(request, "create", profile.id, 10);
  if (limited) return limited;
  const body = await request.json().catch(() => null);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  const result = await createDiceRoom({ ...parsed.data, hostId: profile.id, hostName: profile.nickname });
  return NextResponse.json(result, { status: "error" in result ? 409 : 201, headers: { "cache-control": "private, no-store" } });
}
export async function PUT(request: Request) {
  if (!isDicePreviewEnabled()) return NextResponse.json({ error: "ROOM_NOT_FOUND" }, { status: 404 });
  const originGuard = await guardDiceWrite(request, "origin");
  if (originGuard) return originGuard;
  const profile = await getOptionalCurrentUserProfile();
  if (!profile) return NextResponse.json({ error: "SIGN_IN_REQUIRED" }, { status: 401 });
  const limited = await guardDiceWrite(request, "join", profile.id, 30);
  if (limited) return limited;
  const parsed = joinSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  const result = await joinDiceRoom({ ...parsed.data, profileId: profile.id, displayName: profile.nickname });
  return NextResponse.json(result, { status: "error" in result ? 409 : 200, headers: { "cache-control": "private, no-store" } });
}
