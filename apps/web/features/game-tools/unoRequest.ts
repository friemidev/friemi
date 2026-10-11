import { z } from "zod";

const color = z.enum(["red", "yellow", "green", "blue"]);
// These counters also enter PostgreSQL Int columns in command receipts.
// Reject overflow before a stale request can turn into a database failure.
const storedCounter = z.number().int().max(2_147_483_647);
const action = z.discriminatedUnion("type", [
  z.object({ type: z.literal("START") }),
  z.object({ type: z.literal("PLAY"), cardId: z.string().min(1).max(64), color: color.optional(), handVersion: z.number().int().nonnegative() }),
  z.object({ type: z.literal("DRAW") }),
  z.object({ type: z.literal("PASS") }),
  z.object({ type: z.literal("CALL_UNO"), episodeId: z.number().int().nonnegative() }),
  z.object({ type: z.literal("CATCH_UNO"), targetSeat: z.number().int().min(0).max(9), episodeId: z.number().int().nonnegative(), roundNumber: storedCounter.positive() }),
  z.object({ type: z.literal("ACCEPT_DRAW_FOUR") }),
  z.object({ type: z.literal("CHALLENGE_DRAW_FOUR") }),
  z.object({ type: z.literal("CHOOSE_COLOR"), color }),
  z.object({ type: z.literal("NEXT_ROUND") }),
  z.object({ type: z.literal("REMATCH") }),
]);

export const unoCommandSchema = z.object({
  commandId: z.string().min(8).max(64).regex(/^[a-zA-Z0-9_-]+$/),
  matchNumber: storedCounter.positive(),
  roundNumber: storedCounter.nonnegative(),
  turnId: z.number().int().nonnegative(),
  action,
});

// Unreceipted writes bind the original visible revision. A delayed request
// must not apply readiness, settings or an exit to a newer room lifecycle.
export const unoMutationSchema = z.object({ expectedRevision: storedCounter.nonnegative() });

export function isUnoSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try { return new URL(origin).origin === new URL(request.url).origin; }
  catch { return false; }
}
