import assert from "node:assert/strict";
import test from "node:test";
import { canRetryUnoRoomWrite, isUnoRoomAccessError, sendUnoRoomWrite, type UnoPendingWrite } from "./unoRoomRequest";

test("unknown lifecycle writes require a fresh snapshot, never a replay of old intent", async () => {
  const seen: string[] = [];
  const write: UnoPendingWrite = { path: "/leave", method: "POST", body: { expectedRevision: 12 } };
  const fetcher = (async (url: unknown) => { seen.push(String(url)); throw new TypeError("connection lost"); }) as typeof fetch;
  assert.equal((await sendUnoRoomWrite("/room", write, fetcher)).status, "uncertain");
  assert.equal(canRetryUnoRoomWrite(write), false);
  for (const path of ["/ready", "/character", "", "/return"]) assert.equal(canRetryUnoRoomWrite({ ...write, path }), false);
  assert.deepEqual(seen, ["/room/leave"]);
});

test("unknown action results preserve command ID through retryable server and rate errors", async () => {
  const bodies: string[] = [];
  const responses = [Response.json({ error: "TRY_AGAIN" }, { status: 409 }), Response.json({ error: "RATE_LIMITED" }, { status: 429 }), Response.json({ error: "SERVER" }, { status: 503 }), Response.json({ room: { id: "room", revision: 4 } })];
  const fetcher = (async (_url: unknown, init?: RequestInit) => { bodies.push(String(init?.body)); return responses.shift()!; }) as typeof fetch;
  const write: UnoPendingWrite = { path: "/actions", method: "POST", body: { commandId: "same-original-id", action: { type: "DRAW" } } };
  assert.equal(canRetryUnoRoomWrite(write), true);
  for (let index = 0; index < 3; index += 1) assert.equal((await sendUnoRoomWrite("/room", write, fetcher)).status, "uncertain");
  assert.equal((await sendUnoRoomWrite("/room", write, fetcher)).status, "accepted");
  assert.equal(new Set(bodies).size, 1);
});

test("uncertain reaction retries keep the same receipt ID", async () => {
  const bodies: string[] = [];
  const write: UnoPendingWrite = { path: "/reactions", method: "POST", body: { reactionId: "original-reaction", kind: "laugh" } };
  const fetcher = (async (_url: unknown, init?: RequestInit) => { bodies.push(String(init?.body)); if (bodies.length === 1) throw new Error("lost"); return Response.json({ room: { id: "room", revision: 9 } }); }) as typeof fetch;
  assert.equal(canRetryUnoRoomWrite(write), true);
  assert.equal((await sendUnoRoomWrite("/room", write, fetcher)).status, "uncertain");
  assert.equal((await sendUnoRoomWrite("/room", write, fetcher)).status, "accepted");
  assert.equal(new Set(bodies).size, 1);
});

test("malformed success is uncertain, while definitive game errors release the request", async () => {
  const write: UnoPendingWrite = { path: "/ready", method: "POST", body: { ready: true } };
  assert.equal((await sendUnoRoomWrite("/room", write, async () => Response.json({}))).status, "uncertain");
  assert.equal((await sendUnoRoomWrite("/room", write, async () => new Response("proxy error", { status: 200 }))).status, "uncertain");
  assert.deepEqual(await sendUnoRoomWrite("/room", write, async () => Response.json({ error: "WRONG_PHASE" }, { status: 409 })), { status: "rejected", error: "WRONG_PHASE", room: undefined });
});

test("membership and authentication failures are distinguished from connectivity", () => {
  assert.equal(isUnoRoomAccessError("NOT_A_MEMBER"), true);
  assert.equal(isUnoRoomAccessError("SIGN_IN_REQUIRED"), true);
  assert.equal(isUnoRoomAccessError("ROOM_NOT_FOUND"), true);
  assert.equal(isUnoRoomAccessError("TRY_AGAIN"), false);
  assert.equal(isUnoRoomAccessError("NETWORK"), false);
});
