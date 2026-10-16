import assert from "node:assert/strict";
import test from "node:test";
import { hashDdzRequest, ddzReceiptError, ddzCommandConflict, ddzMutationConflict } from "./doudizhuProtocol";
import { ddzCommandSchema, ddzMutationSchema, isDdzSameOrigin } from "./doudizhuRequest";
import { createDdzState } from "./doudizhuEngine";
import type { DdzRoomCommand } from "./doudizhuRoomTypes";
const state = createDdzState([0, 1, 2].map(seat => ({ seat, name: String(seat) })));
const command: DdzRoomCommand = { commandId: "d8b92556-a066-40e5-9b81-50b0fc2f6b51", gameNo: 0, dealNo: 0, expectedPhase: "LOBBY", turnId: 0, expectedRevision: 4, action: { type: "START" } };
test("canonical request hashes bind complete intent, not object insertion order", () => {
  assert.equal(hashDdzRequest("action", { a: 1, b: { c: 2, d: 3 } }), hashDdzRequest("action", { b: { d: 3, c: 2 }, a: 1 }));
  assert.notEqual(hashDdzRequest("action", command), hashDdzRequest("action", { ...command, gameNo: 1 }));
  assert.notEqual(hashDdzRequest("action", command), hashDdzRequest("leave", command));
});
test("receipt replay cannot cross actor or alter content", () => {
  const receipt = { actorProfileId: "A", actionHash: "original" };
  assert.equal(ddzReceiptError(receipt, "A", "original"), null);
  assert.equal(ddzReceiptError(receipt, "B", "original"), "COMMAND_ID_USED");
  assert.equal(ddzReceiptError(receipt, "A", "changed"), "COMMAND_ID_USED");
});
test("semantic action checks ignore cosmetic revision but bind turn and private hand", () => {
  assert.equal(ddzCommandConflict(state, 4, 0, command), null);
  assert.equal(ddzCommandConflict(state, 5, 0, command), "STALE_COMMAND");
  const play = { ...command, action: { type: "PLAY" as const, cardIds: ["3C"] }, handVersion: 0 };
  assert.equal(ddzCommandConflict(state, 99, 0, play), null);
  assert.equal(ddzCommandConflict(state, 99, 0, { ...play, turnId: 1 }), "STALE_TURN");
  assert.equal(ddzCommandConflict(state, 99, 0, { ...play, handVersion: 1 }), "STALE_HAND");
  assert.equal(ddzCommandConflict(state, 99, 0, { ...play, gameNo: 1 }), "STALE_GAME");
  assert.equal(ddzMutationConflict(state, 4, { ...command, expectedRevision: 3 }), "STALE_COMMAND");
});
test("wire validation rejects missing versions, actor injection, overflow and unbounded card lists", () => {
  assert.equal(ddzCommandSchema.safeParse(command).success, true);
  assert.equal(ddzCommandSchema.safeParse({ ...command, action: { type: "PLAY", cardIds: ["3C"] } }).success, false);
  assert.equal(ddzCommandSchema.safeParse({ ...command, profileId: "another-account" }).success, false);
  assert.equal(ddzCommandSchema.safeParse({ ...command, gameNo: 2 ** 31 }).success, false);
  assert.equal(ddzCommandSchema.safeParse({ ...command, action: { type: "PLAY", cardIds: Array(21).fill("3C") }, handVersion: 0 }).success, false);
  assert.equal(ddzMutationSchema.safeParse({ commandId: command.commandId, gameNo: 0, expectedPhase: "LOBBY" }).success, false);
});
test("write origin validation binds protocol and browser-facing host", () => {
  assert.equal(isDdzSameOrigin(new Request("https://friemi.app/api/game-tools/doudizhu/rooms", { headers: { origin: "https://friemi.app" } })), true);
  assert.equal(isDdzSameOrigin(new Request("https://friemi.app/api/game-tools/doudizhu/rooms", { headers: { origin: "https://evil.example" } })), false);
  assert.equal(isDdzSameOrigin(new Request("https://friemi.app/api/game-tools/doudizhu/rooms")), false);
});
