import { createHash } from "node:crypto";
import type { DdzRoomCommand, DdzRoomMutation } from "./doudizhuRoomTypes";
import type { DdzState } from "./doudizhuTypes";
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => [k, canonical(v)]));
  return value;
}
export function hashDdzRequest(scope: string, body: unknown) { return createHash("sha256").update(JSON.stringify(canonical({ scope, body }))).digest("hex"); }
export function ddzReceiptError(receipt: { actorProfileId: string; actionHash: string }, actor: string, hash: string) { return receipt.actorProfileId === actor && receipt.actionHash === hash ? null : "COMMAND_ID_USED"; }
export function ddzCommandConflict(state: DdzState, revision: number, seat: number, command: DdzRoomCommand) {
  if (command.gameNo !== state.gameNo || command.dealNo !== state.dealNo) return "STALE_GAME";
  if (command.expectedPhase !== state.phase) return "WRONG_PHASE";
  if (command.turnId !== state.turnId) return "STALE_TURN";
  if (command.action.type === "START" && command.expectedRevision !== revision) return "STALE_COMMAND";
  if (command.action.type === "PLAY" && command.handVersion !== state.handVersions[seat]) return "STALE_HAND";
  return null;
}
export function ddzMutationConflict(state: DdzState, revision: number, command: DdzRoomMutation) {
  if (command.gameNo !== state.gameNo) return "STALE_GAME";
  if (command.expectedPhase !== state.phase) return "WRONG_PHASE";
  return command.expectedRevision !== revision ? "STALE_COMMAND" : null;
}
