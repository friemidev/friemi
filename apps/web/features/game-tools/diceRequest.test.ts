import assert from "node:assert/strict";
import test from "node:test";
import { fetchDiceResponse } from "./diceRequest";

test("a stalled dice request times out and aborts its transport", async (t) => {
  let signal: AbortSignal | null | undefined;
  t.mock.method(globalThis, "fetch", (_url: RequestInfo | URL, init?: RequestInit) => {
    signal = init?.signal;
    return new Promise<Response>(() => {});
  });
  await assert.rejects(fetchDiceResponse("/rooms", undefined, 10), /DICE_REQUEST_TIMEOUT/);
  assert.equal(signal?.aborted, true);
});

test("a stalled dice response body shares the request deadline", async (t) => {
  t.mock.method(globalThis, "fetch", async () => ({
    status: 200,
    json: () => new Promise(() => {}),
  }) as Response);
  await assert.rejects(fetchDiceResponse("/rooms", undefined, 10), /DICE_REQUEST_TIMEOUT/);
});

test("leaving the dice page cancels even a transport that ignores abort", async (t) => {
  let signal: AbortSignal | null | undefined;
  t.mock.method(globalThis, "fetch", (_url: RequestInfo | URL, init?: RequestInit) => {
    signal = init?.signal;
    return new Promise<Response>(() => {});
  });
  const controller = new AbortController();
  const request = fetchDiceResponse("/rooms", { signal: controller.signal });
  controller.abort();
  await assert.rejects(request, { name: "AbortError" });
  assert.equal(signal?.aborted, true);
});

test("dice commands retain their body and parse a successful response", async (t) => {
  const body = JSON.stringify({ commandId: "test-command", action: { type: "READY", ready: true } });
  let options: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (_url: RequestInfo | URL, init?: RequestInit) => {
    options = init;
    return Response.json({ room: { revision: 2 } });
  });
  const result = await fetchDiceResponse<{ room: { revision: number } }>("/rooms/test", { method: "POST", body });
  assert.equal(options?.method, "POST");
  assert.equal(options?.body, body);
  assert.deepEqual(result.data, { room: { revision: 2 } });
  assert.equal(options?.signal?.aborted, false);
});

test("unchanged dice rooms do not parse the empty 304 response", async (t) => {
  const response = new Response(null, { status: 304 });
  const parser = t.mock.method(response, "json", async () => { throw new Error("Unexpected parse"); });
  t.mock.method(globalThis, "fetch", async () => response);
  const result = await fetchDiceResponse("/rooms/test");
  assert.equal(result.data, null);
  assert.equal(parser.mock.callCount(), 0);
});
