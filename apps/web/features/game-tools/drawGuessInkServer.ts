import "server-only";

import { getDrawGuessInkTopic, DRAW_GUESS_INK_EVENT } from "@/features/game-tools/drawGuessRealtime";
import { getOptionalRedis } from "@/lib/redis";
import { getRedisRuntimeConfig } from "@/lib/redisConfig";
import { prisma } from "@/lib/prisma";
import type { DrawStroke } from "@/features/game-tools/drawGuessEngine";

export type DrawGuessInkBatch = {
  gameNumber: number;
  roomId: string;
  seq: number;
  stroke: DrawStroke;
  strokeIndex: number;
  turnIndex: number;
};

export async function getAuthorizedDrawGuessInkArtist(input: {
  clerkUserId: string;
  gameNumber: number;
  roomId: string;
  turnIndex: number;
}) {
  const rows = await prisma.$queryRaw<{ profileId: string }[]>`
    SELECT member."profileId" AS "profileId"
    FROM "GameToolRoom" AS room
    JOIN "GameToolRoomMember" AS member ON member."roomId" = room.id AND member."leftAt" IS NULL
    JOIN "GameToolSeat" AS seat ON seat."roomId" = room.id AND seat."profileId" = member."profileId" AND seat."leftAt" IS NULL
    JOIN "UserProfile" AS profile ON profile.id = member."profileId"
    WHERE room.id = ${input.roomId}
      AND room.kind = 'DRAW_GUESS'
      AND room.status = 'IN_PROGRESS'
      AND room."drawGuessDeadlineAt" > NOW()
      AND room.state->>'mode' = 'CLASSIC'
      AND room.state->>'phase' = 'DRAW_GUESS'
      AND (room.state->>'drawDeadlineAt' IS NULL OR (room.state->>'drawDeadlineAt')::timestamptz > NOW())
      AND (room.state->>'gameNumber')::int = ${input.gameNumber}
      AND (room.state->>'turnIndex')::int = ${input.turnIndex}
      AND seat."seatNumber" = ${input.turnIndex + 1}
      AND profile."clerkUserId" = ${input.clerkUserId}
      AND profile.status = 'ACTIVE'
    LIMIT 1
  `;
  return rows[0]?.profileId ?? null;
}

function sequenceKey(roomId: string, gameNumber: number, turnIndex: number) {
  return `${getRedisRuntimeConfig().keyPrefix}:draw-guess:ink:${roomId}:${gameNumber}:${turnIndex}:seq`;
}

export async function getDrawGuessInkSequence(roomId: string, gameNumber: number, turnIndex: number) {
  const redis = getOptionalRedis();
  if (!redis) return 0;
  const value = await redis.get<number>(sequenceKey(roomId, gameNumber, turnIndex)).catch(() => null);
  return typeof value === "number" && Number.isSafeInteger(value) ? value : 0;
}

export async function reserveDrawGuessInkSequence(roomId: string, gameNumber: number, turnIndex: number, profileId: string) {
  const redis = getOptionalRedis();
  if (!redis) return { error: "INK_UNAVAILABLE" } as const;
  const prefix = getRedisRuntimeConfig().keyPrefix;
  const rateKey = `${prefix}:draw-guess:ink:${roomId}:${gameNumber}:${turnIndex}:${profileId}:rate`;
  try {
    const result = Number(await redis.eval(
      "local n = redis.call('INCR', KEYS[1]); if n == 1 then redis.call('EXPIRE', KEYS[1], 1) end; if n > 10 then return -1 end; local s = redis.call('INCR', KEYS[2]); if s == 1 then redis.call('EXPIRE', KEYS[2], 120) end; return s",
      [rateKey, sequenceKey(roomId, gameNumber, turnIndex)],
      [],
    ));
    return result > 0 ? { seq: result } as const : { error: "INK_RATE_LIMITED" } as const;
  } catch {
    return { error: "INK_UNAVAILABLE" } as const;
  }
}

export async function broadcastDrawGuessInk(batch: DrawGuessInkBatch) {
  const topic = getDrawGuessInkTopic(batch.roomId, batch.gameNumber, batch.turnIndex);
  try {
    await prisma.$queryRaw`SELECT realtime.send(${JSON.stringify(batch)}::jsonb, ${DRAW_GUESS_INK_EVENT}, ${topic}, true)::text`;
    return true;
  } catch {
    console.warn("[draw-guess] ink broadcast unavailable");
    return false;
  }
}
