import { NextResponse } from "next/server";
import { z } from "zod";
import { commandDrawGuessRoom, rematchDrawGuessRoom, startDrawGuessRoom } from "@/features/game-tools/drawGuessRoomServer";
import { getExistingDrawGuessProfileId } from "@/features/game-tools/drawGuessAuth";

const stroke = z.object({
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  points: z.array(z.tuple([z.number().min(0).max(1), z.number().min(0).max(1)])).min(1).max(512),
  width: z.number().min(1).max(24),
});
const action = z.discriminatedUnion("type", [
  z.object({ type: z.literal("CHOOSE_WORD"), value: z.string().min(1).max(40) }),
  z.object({ type: z.literal("GUESS"), value: z.string().min(1).max(20) }),
  z.object({ type: z.literal("REACT"), kind: z.enum(["😂", "👏", "👀"]) }),
  z.object({ type: z.literal("CHAIN_REACT"), kind: z.enum(["😂", "👏", "😮"]), owner: z.number().int().min(-1).max(9), step: z.number().int().min(-1).max(9) }),
  z.object({ type: z.literal("REVEAL_CONTROL"), command: z.enum(["PAUSE", "RESUME", "NEXT"]) }),
  z.object({ type: z.literal("LAUGH_GUESS"), messageId: z.string().min(4).max(80) }),
  z.object({ type: z.literal("ADD_STROKE"), stroke }),
  z.object({ type: z.literal("UNDO_STROKE") }),
  z.object({ type: z.literal("CLEAR_STROKES") }),
  z.object({ type: z.literal("SAVE_CLASSIC_DRAFT"), strokes: z.array(stroke).max(120), inkSeq: z.number().int().min(0).optional() }),
  z.object({ type: z.literal("SAVE_DRAFT"), strokes: z.array(stroke).max(120) }),
  z.object({ type: z.literal("SUBMIT_STEP"), value: z.string().max(40).optional(), strokes: z.array(stroke).max(120).optional() }),
  z.object({ type: z.literal("VOTE_ARTWORK"), owner: z.number().int().min(0).max(9), step: z.number().int().min(0).max(9) }),
  z.object({ type: z.literal("VOTE"), owner: z.number().int().min(0).max(9), value: z.boolean() }),
  z.object({ type: z.literal("PICK"), owner: z.number().int().min(0).max(9), step: z.number().int().min(0).max(9) }),
]);
const command = z.object({
  commandId: z.string().min(8).max(64),
  expectedChainStage: z.number().int().min(0).max(10),
  expectedPhase: z.enum(["WORD_SELECT", "DRAW_GUESS", "TURN_REVEAL", "CHAIN_WORD", "CHAIN_STEP", "MATCH_VOTE", "MATCH_RESULT", "CHAIN_REVEAL", "ARTWORK_VOTE", "ARTWORK_RESULT", "REVEAL_VOTE", "AUTHOR_PICK"]),
  expectedTurnIndex: z.number().int().min(0).max(10),
  gameNumber: z.number().int().min(1),
  action,
});

export async function POST(request: Request, context: { params: Promise<{ roomId: string }> }) {
  const profileId = await getExistingDrawGuessProfileId();
  if (!profileId) return NextResponse.json({ error: "SIGN_IN_REQUIRED" }, { status: 401 });
  const { roomId } = await context.params;
  const body = await request.json().catch(() => null);
  if (body?.action?.type === "START") {
    const result = await startDrawGuessRoom(roomId, profileId);
    return NextResponse.json(result, { status: "error" in result ? 409 : 200 });
  }
  if (body?.action?.type === "REMATCH") {
    const result = await rematchDrawGuessRoom(roomId, profileId);
    return NextResponse.json(result, { status: "error" in result ? 409 : 200 });
  }
  const parsed = command.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "INVALID_REQUEST" }, { status: 400 });
  if (JSON.stringify(parsed.data.action).length > 100_000) return NextResponse.json({ error: "PAYLOAD_TOO_LARGE" }, { status: 413 });
  const result = await commandDrawGuessRoom({ ...parsed.data, profileId, roomId });
  return NextResponse.json(result, { status: "error" in result ? 409 : 200 });
}
