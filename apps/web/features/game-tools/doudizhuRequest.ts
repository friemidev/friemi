import { z } from "zod";
export { isUnoSameOrigin as isDdzSameOrigin } from "./unoRequest";
const counter = z.number().int().min(0).max(2_147_483_647);
export const ddzPhaseSchema = z.enum(["LOBBY", "BIDDING", "PLAYING", "RESULT", "CLOSED"]);
export const ddzMutationSchema = z.object({ commandId: z.string().uuid(), expectedRevision: counter, gameNo: counter, expectedPhase: ddzPhaseSchema });
export const ddzCommandSchema = z.object({
  commandId: z.string().uuid(), gameNo: counter, dealNo: counter, turnId: counter, expectedPhase: ddzPhaseSchema,
  handVersion: counter.optional(), expectedRevision: counter.optional(),
  action: z.discriminatedUnion("type", [
    z.object({ type: z.literal("START") }).strict(),
    z.object({ type: z.literal("BID"), score: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]) }).strict(),
    z.object({ type: z.literal("PLAY"), cardIds: z.array(z.string().min(1).max(16)).min(1).max(20), handVersion: counter.optional() }).strict(),
    z.object({ type: z.literal("PASS") }).strict(),
    z.object({ type: z.literal("SET_MANAGED"), managed: z.boolean() }).strict(),
  ]),
}).strict().refine(c => c.action.type !== "START" || c.expectedRevision !== undefined)
  .refine(c => c.action.type !== "PLAY" || c.handVersion !== undefined);
export const ddzCreateSchema = z.object({ commandId: z.string().uuid(), locale: z.enum(["zh-CN", "en", "fr"]).default("zh-CN") }).strict();
export const ddzJoinSchema = z.object({ commandId: z.string().uuid(), code: z.string().trim().regex(/^[a-zA-Z0-9]{6,8}$/), expectedRoomId: z.string().min(1).max(64).optional() }).strict();
export const ddzReactionSchema = z.object({ commandId: z.string().uuid(), reactionId: z.string().uuid(), gameNo: counter, expectedPhase: ddzPhaseSchema, kind: z.enum(["wave", "clap", "cheer"]) }).strict();
