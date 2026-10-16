import assert from "node:assert/strict";
import test from "node:test";
import { fetchDrawGuessResponse } from "./drawGuessRequest";

const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const timeout = /DRAW_GUESS_REQUEST_TIMEOUT/;

test("a transport that never resolves is bounded and receives an abort", async (t) => {
  let signal: AbortSignal | undefined;
  t.mock.method(globalThis, "fetch", (_url: RequestInfo | URL, init?: RequestInit) => {
    signal = init?.signal ?? undefined;
    return new Promise<Response>(() => {});
  });
  await assert.rejects(fetchDrawGuessResponse("/room", undefined, 10), timeout);
  assert.equal(signal?.aborted, true);
});

test("body parsing shares the request timeout even when json ignores abort", async (t) => {
  let signal: AbortSignal | undefined;
  t.mock.method(globalThis, "fetch", async (_url: RequestInfo | URL, init?: RequestInit) => {
    signal = init?.signal ?? undefined;
    return { status: 200, json: () => new Promise(() => {}) } as Response;
  });
  await assert.rejects(fetchDrawGuessResponse("/room", undefined, 10), timeout);
  assert.equal(signal?.aborted, true);
});

test("successful responses preserve options and clear the timer without aborting", async (t) => {
  let options: RequestInit | undefined;
  const response = Response.json({ ok: true });
  t.mock.method(globalThis, "fetch", async (_url: RequestInfo | URL, init?: RequestInit) => {
    options = init;
    return response;
  });
  const result = await fetchDrawGuessResponse<{ ok: boolean }>("/actions", { method: "POST", body: "{}" }, 10);
  assert.equal(result.response, response);
  assert.deepEqual(result.data, { ok: true });
  assert.equal(options?.method, "POST");
  assert.equal(options?.body, "{}");
  await pause(25);
  assert.equal(options?.signal?.aborted, false);
});

test("304 responses do not attempt to parse an empty body", async (t) => {
  const response = new Response(null, { status: 304 });
  const parse = t.mock.method(response, "json", async () => { throw new Error("Unexpected parse"); });
  t.mock.method(globalThis, "fetch", async () => response);
  assert.deepEqual(await fetchDrawGuessResponse("/room"), { response, data: null });
  assert.equal(parse.mock.callCount(), 0);
});

test("a late fetch response cannot turn an expired request into success", async (t) => {
  let resolve!: (response: Response) => void;
  t.mock.method(globalThis, "fetch", () => new Promise<Response>((done) => { resolve = done; }));
  let successes = 0;
  let failures = 0;
  const request = fetchDrawGuessResponse("/room", undefined, 10);
  void request.then(() => { successes += 1; }, () => { failures += 1; });
  await assert.rejects(request, timeout);
  resolve(Response.json({ ok: true }));
  await pause(0);
  assert.equal(successes, 0);
  assert.equal(failures, 1);
});

test("a late body rejection cannot replace the timeout or leak a rejection", async (t) => {
  let rejectBody!: (reason: Error) => void;
  t.mock.method(globalThis, "fetch", async () => ({
    status: 200,
    json: () => new Promise((_, reject) => { rejectBody = reject; }),
  }) as Response);
  const request = fetchDrawGuessResponse("/room", undefined, 10);
  await assert.rejects(request, timeout);
  rejectBody(new Error("Late parser failure"));
  await pause(0);
  await assert.rejects(request, timeout);
});

test("a caller's abort also releases transports that ignore their signal", async (t) => {
  let signal: AbortSignal | undefined;
  t.mock.method(globalThis, "fetch", (_url: RequestInfo | URL, init?: RequestInit) => {
    signal = init?.signal ?? undefined;
    return new Promise<Response>(() => {});
  });
  const controller = new AbortController();
  const reason = new Error("Task changed");
  const request = fetchDrawGuessResponse("/room", { signal: controller.signal });
  controller.abort(reason);
  await assert.rejects(request, (error) => error === reason);
  assert.equal(signal?.aborted, true);
});

test("an already aborted caller does not start a request", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () => Response.json({}));
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(fetchDrawGuessResponse("/room", { signal: controller.signal }), { name: "AbortError" });
  assert.equal(fetchMock.mock.callCount(), 0);
});
