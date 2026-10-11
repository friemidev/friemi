import assert from "node:assert/strict";
import test from "node:test";
import { fetchDrawGuessRoomWithRecovery } from "./drawGuessRoomRecovery";

const roomId = "room-123";
const code = "ABC123";
const roomPath = `/api/game-tools/draw-guess/rooms/${roomId}`;
const absent = () => Response.json({ error: "NOT_A_PLAYER" }, { status: 404 });

test("expired membership joins once and obtains a fresh room snapshot without conditional headers", async (t) => {
  const room = { id: roomId, viewerSeat: 2, revision: 7 };
  const responses = [absent(), Response.json({ roomId }), Response.json({ room })];
  const requests: { url: RequestInfo | URL; init?: RequestInit }[] = [];
  t.mock.method(globalThis, "fetch", async (url: RequestInfo | URL, init?: RequestInit) => {
    requests.push({ url, init });
    return responses.shift()!;
  });

  const result = await fetchDrawGuessRoomWithRecovery(roomId, code, {
    credentials: "same-origin",
    headers: { "If-None-Match": 'W/"draw-guess-7"', "If-Modified-Since": "yesterday", "x-request-id": "resume" },
  });

  assert.deepEqual(result.data, { room });
  assert.deepEqual(requests.map(({ url }) => url), [roomPath, "/api/game-tools/draw-guess/join", roomPath]);
  assert.equal(new Headers(requests[0].init?.headers).get("if-none-match"), 'W/"draw-guess-7"');
  assert.equal(requests[0].init?.cache, "no-store");
  assert.equal(requests[1].init?.method, "POST");
  assert.deepEqual(JSON.parse(String(requests[1].init?.body)), { code, expectedRoomId: roomId });
  assert.equal(new Headers(requests[1].init?.headers).get("content-type"), "application/json");
  assert.equal(requests[2].init?.method, "GET");
  assert.equal(requests[2].init?.cache, "no-store");
  assert.equal(requests[2].init?.credentials, "same-origin");
  const freshHeaders = new Headers(requests[2].init?.headers);
  assert.equal(freshHeaders.get("if-none-match"), null);
  assert.equal(freshHeaders.get("if-modified-since"), null);
  assert.equal(freshHeaders.get("x-request-id"), "resume");
});

test("success, unchanged snapshots, terminal room errors and unauthorized responses never join", async (t) => {
  for (const response of [
    Response.json({ room: { id: roomId } }),
    new Response(null, { status: 304 }),
    Response.json({ error: "KICKED" }, { status: 403 }),
    Response.json({ error: "ROOM_NOT_FOUND" }, { status: 404 }),
    Response.json({ error: "SIGN_IN_REQUIRED" }, { status: 401 }),
    Response.json({ error: "NOT_A_PLAYER" }, { status: 401 }),
  ]) {
    await t.test(`status ${response.status}: ${await response.clone().text()}`, async (child) => {
      child.mock.method(Date, "now", () => 1_234);
      const fetchMock = child.mock.method(globalThis, "fetch", async () => response);
      const result = await fetchDrawGuessRoomWithRecovery(roomId, code);
      assert.equal(result.response, response);
      assert.equal(result.requestedAt, 1_234);
      assert.equal(fetchMock.mock.callCount(), 1);
    });
  }
});

test("clock sampling uses the fresh GET start and excludes a slow membership join", async (t) => {
  let now = 1_000;
  let calls = 0;
  t.mock.method(Date, "now", () => now);
  t.mock.method(globalThis, "fetch", async () => {
    if (calls++ === 0) {
      now += 200;
      return absent();
    }
    if (calls === 2) {
      now += 4_000;
      return Response.json({ roomId });
    }
    now += 100;
    return Response.json({ room: { id: roomId, view: { serverNow: new Date(now - 50).toISOString() } } });
  });

  const result = await fetchDrawGuessRoomWithRecovery(roomId, code);
  assert.equal(calls, 3);
  assert.equal(result.requestedAt, 5_200);
  assert.equal(Date.now() - result.requestedAt, 100);
  const measuredOffset = Date.parse(result.data!.room!.view.serverNow!) - (result.requestedAt + Date.now()) / 2;
  assert.equal(measuredOffset, 0);
});

test("a network failure rejects without attempting to join", async (t) => {
  const failure = new TypeError("Network unavailable");
  const fetchMock = t.mock.method(globalThis, "fetch", async () => { throw failure; });
  await assert.rejects(fetchDrawGuessRoomWithRecovery(roomId, code), (error) => error === failure);
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("recovery eligibility is checked after the initial GET finishes", async (t) => {
  let eligible = true;
  let resolve!: (response: Response) => void;
  const response = absent();
  const fetchMock = t.mock.method(globalThis, "fetch", () => new Promise<Response>((done) => { resolve = done; }));
  const request = fetchDrawGuessRoomWithRecovery(roomId, code, { shouldRecover: () => eligible });
  eligible = false;
  resolve(response);
  assert.equal((await request).response, response);
  assert.equal(fetchMock.mock.callCount(), 1);
});

test("failed joins preserve server errors without another GET or join", async (t) => {
  for (const [error, status] of [["KICKED", 409], ["ROOM_NOT_FOUND", 409], ["SIGN_IN_REQUIRED", 401]] as const) {
    await t.test(error, async (child) => {
      const failure = Response.json({ error }, { status });
      const responses = [absent(), failure];
      const fetchMock = child.mock.method(globalThis, "fetch", async () => responses.shift()!);
      const result = await fetchDrawGuessRoomWithRecovery(roomId, code);
      assert.equal(result.response, failure);
      assert.deepEqual(result.data, { error });
      assert.equal(fetchMock.mock.callCount(), 2);
    });
  }
});

test("a join for an unexpected room cannot supply a recovered snapshot", async (t) => {
  const snapshot = absent();
  const responses = [snapshot, Response.json({ roomId: "different-room" })];
  const fetchMock = t.mock.method(globalThis, "fetch", async () => responses.shift()!);
  const result = await fetchDrawGuessRoomWithRecovery(roomId, code);
  assert.equal(result.response, snapshot);
  assert.equal(fetchMock.mock.callCount(), 2);
});

test("a second NOT_A_PLAYER response ends recovery after one join", async (t) => {
  const final = absent();
  const responses = [absent(), Response.json({ roomId }), final];
  const fetchMock = t.mock.method(globalThis, "fetch", async () => responses.shift()!);
  assert.equal((await fetchDrawGuessRoomWithRecovery(roomId, code)).response, final);
  assert.equal(fetchMock.mock.callCount(), 3);
});

test("all recovery requests retain the timeout when a transport or body reader stalls", async (t) => {
  for (const stalledStep of [0, 1, 2]) {
    await t.test(`stalled request ${stalledStep + 1}`, async (child) => {
      let calls = 0;
      let signal: AbortSignal | null | undefined;
      const responses = [absent(), Response.json({ roomId })];
      child.mock.method(globalThis, "fetch", async (_url: RequestInfo | URL, init?: RequestInit) => {
        signal = init?.signal;
        if (calls++ === stalledStep) return { status: 200, json: () => new Promise(() => {}) } as Response;
        return responses.shift()!;
      });
      await assert.rejects(fetchDrawGuessRoomWithRecovery(roomId, code, { timeoutMs: 10 }), /DRAW_GUESS_REQUEST_TIMEOUT/);
      assert.equal(signal?.aborted, true);
      assert.equal(calls, stalledStep + 1);
    });
  }
});

test("a caller abort during recovery stops a join even when its transport ignores abort", async (t) => {
  const controller = new AbortController();
  let startedJoin!: () => void;
  const joining = new Promise<void>((resolve) => { startedJoin = resolve; });
  let calls = 0;
  t.mock.method(globalThis, "fetch", async () => {
    if (calls++ === 0) return absent();
    startedJoin();
    return new Promise<Response>(() => {});
  });
  const request = fetchDrawGuessRoomWithRecovery(roomId, code, { signal: controller.signal });
  await joining;
  controller.abort();
  await assert.rejects(request, { name: "AbortError" });
  assert.equal(calls, 2);
});
