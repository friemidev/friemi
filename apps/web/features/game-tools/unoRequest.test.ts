import assert from "node:assert/strict";
import test from "node:test";
import { isUnoSameOrigin, unoCommandSchema, unoMutationSchema } from "./unoRequest";

const envelope = { commandId: "command-123", matchNumber: 1, roundNumber: 1, turnId: 3 };

test("UNO commands require versions, explicit card ownership version and declaration episode", () => {
  assert.equal(unoCommandSchema.safeParse({ ...envelope, action: { type: "START" } }).success, false);
  assert.equal(unoCommandSchema.safeParse({ ...envelope, expectedRevision: 4, action: { type: "START" } }).success, true);
  assert.equal(unoCommandSchema.safeParse({ ...envelope, action: { type: "PLAY", cardId: "red-3-a" } }).success, false);
  assert.equal(unoCommandSchema.safeParse({ ...envelope, action: { type: "PLAY", cardId: "red-3-a", handVersion: 7 } }).success, true);
  assert.equal(unoCommandSchema.safeParse({ ...envelope, action: { type: "CALL_UNO" } }).success, false);
  assert.equal(unoCommandSchema.safeParse({ ...envelope, action: { type: "CALL_UNO", episodeId: 2 } }).success, true);
  const call = unoCommandSchema.parse({ ...envelope, action: { type: "CALL_UNO", episodeId: 2, handVersion: 4 } });
  assert.deepEqual(call.action, { type: "CALL_UNO", episodeId: 2, handVersion: 4 });
  assert.equal(unoCommandSchema.safeParse({ ...envelope, action: { type: "CALL_UNO", episodeId: 2, handVersion: -1 } }).success, false);
  assert.equal(unoCommandSchema.safeParse({ ...envelope, matchNumber: undefined, action: { type: "DRAW" } }).success, false);
});

test("UNO request validation rejects invalid report targets, colors and server-only commands", () => {
  for (const action of [
    { type: "CATCH_UNO", targetSeat: -1, episodeId: 1, roundNumber: 1 },
    { type: "CATCH_UNO", targetSeat: 10, episodeId: 1, roundNumber: 1 },
    { type: "CHOOSE_COLOR", color: "purple" },
    { type: "TIMEOUT" },
  ]) assert.equal(unoCommandSchema.safeParse({ ...envelope, action }).success, false);
});

test("UNO mutations reject missing, null and cross-site origins", () => {
  const request = (origin?: string) => new Request("https://friemi.example/api/game-tools/uno/rooms", { method: "POST", headers: origin ? { origin } : {} });
  assert.equal(isUnoSameOrigin(request("https://friemi.example")), true);
  assert.equal(isUnoSameOrigin(request("https://evil.example")), false);
  assert.equal(isUnoSameOrigin(request("http://friemi.example")), false);
  assert.equal(isUnoSameOrigin(request("null")), false);
  assert.equal(isUnoSameOrigin(request()), false);
});

test("UNO accepts the browser-facing host when Next uses a different bind address", () => {
  const request = (origin: string, host = "127.0.0.1:4180", forwardedProtocol?: string) => new Request("http://0.0.0.0:4180/api/game-tools/uno/rooms", {
    method: "POST",
    headers: { origin, host, ...(forwardedProtocol ? { "x-forwarded-proto": forwardedProtocol } : {}) },
  });
  assert.equal(isUnoSameOrigin(request("http://127.0.0.1:4180")), true);
  assert.equal(isUnoSameOrigin(request("http://localhost:4180")), false);
  assert.equal(isUnoSameOrigin(request("http://evil.example")), false);
  assert.equal(isUnoSameOrigin(request("https://127.0.0.1:4180")), false);
  assert.equal(isUnoSameOrigin(request("https://preview.example", "preview.example", "https")), true);
  assert.equal(isUnoSameOrigin(request("http://preview.example", "preview.example", "https")), false);
  assert.equal(isUnoSameOrigin(request("https://preview.example", "preview.example", "javascript")), false);
});

test("unreceipted room writes require the original nonnegative integer revision", () => {
  for (const expectedRevision of [undefined, null, -1, 1.5, "4"]) assert.equal(unoMutationSchema.safeParse({ expectedRevision }).success, false);
  assert.deepEqual(unoMutationSchema.parse({ expectedRevision: 4 }), { expectedRevision: 4 });
});

test("stored round and revision counters reject PostgreSQL integer overflow", () => {
  const request = { ...envelope, action: { type: "DRAW" } };
  for (const value of [2_147_483_648, Number.MAX_SAFE_INTEGER]) {
    assert.equal(unoCommandSchema.safeParse({ ...request, matchNumber: value }).success, false);
    assert.equal(unoCommandSchema.safeParse({ ...request, roundNumber: value }).success, false);
    assert.equal(unoMutationSchema.safeParse({ expectedRevision: value }).success, false);
  }
  assert.equal(unoCommandSchema.safeParse({ ...request, matchNumber: 2_147_483_647, roundNumber: 2_147_483_647 }).success, true);
});
