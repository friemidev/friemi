import assert from "node:assert/strict";
import test from "node:test";
import { sendDdzRoomWrite, type DdzPendingWrite } from "./doudizhuRoomRequest";
const write: DdzPendingWrite = {
  path: "/actions",
  method: "POST",
  body: {
    commandId: "d1f38629-021a-4aee-a973-b3b9293b438e",
    action: { type: "PASS" },
  },
};
test("unknown requests retry identical command and body", async () => {
  const original = globalThis.fetch,
    bodies: string[] = [];
  globalThis.fetch = async (_url, options) => {
    bodies.push(String(options?.body));
    if (bodies.length === 1) throw new TypeError("offline");
    return new Response(JSON.stringify({ ok: true }));
  };
  try {
    assert.deepEqual(await sendDdzRoomWrite("/room", write), {
      status: "uncertain",
    });
    assert.equal((await sendDdzRoomWrite("/room", write)).status, "accepted");
    assert.equal(bodies[0], bodies[1]);
    assert.equal(JSON.parse(bodies[0]).commandId, write.body.commandId);
  } finally {
    globalThis.fetch = original;
  }
});
test("5xx, malformed JSON and empty success stay unknown; 4xx rejects", async () => {
  const original = globalThis.fetch;
  try {
    for (const response of [
      new Response("{}", { status: 500 }),
      new Response("not json"),
      new Response("{}"),
      new Response("null"),
    ]) {
      globalThis.fetch = async () => response;
      assert.equal(
        (await sendDdzRoomWrite("/room", write)).status,
        "uncertain",
      );
    }
    globalThis.fetch = async () =>
      new Response(JSON.stringify({ error: "NOT_YOUR_TURN" }), { status: 409 });
    assert.deepEqual(await sendDdzRoomWrite("/room", write), {
      status: "rejected",
      error: "NOT_YOUR_TURN",
      room: undefined,
    });
  } finally {
    globalThis.fetch = original;
  }
});

test("401 and 403 lock access even with non-JSON bodies", async () => {
  const original = globalThis.fetch;
  try {
    for (const status of [401, 403]) {
      globalThis.fetch = async () =>
        new Response("upstream denied", { status });
      const result = await sendDdzRoomWrite("/room", write);
      assert.equal(result.status, "rejected");
      if (result.status === "rejected")
        assert.equal(
          result.error,
          status === 401 ? "SIGN_IN_REQUIRED" : "NOT_A_MEMBER",
        );
    }
  } finally {
    globalThis.fetch = original;
  }
});
