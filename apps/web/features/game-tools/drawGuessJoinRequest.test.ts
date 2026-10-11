import assert from "node:assert/strict";
import test from "node:test";
import { joinDrawGuessRoomPending } from "./drawGuessJoinRequest";

test("entry and invitation callers share one unfinished normalized join", async (t) => {
  let resolve!: (response: Response) => void;
  let body = "";
  const fetchMock = t.mock.method(globalThis, "fetch", (_url: RequestInfo | URL, init?: RequestInit) => {
    body = String(init?.body);
    return new Promise<Response>((done) => { resolve = done; });
  });
  const first = joinDrawGuessRoomPending({ profileId: "one", code: " abcdef " });
  const second = joinDrawGuessRoomPending({ profileId: "one", code: "ABCDEF" });
  assert.equal(first, second);
  assert.equal(fetchMock.mock.callCount(), 1);
  assert.deepEqual(JSON.parse(body), { code: "ABCDEF" });
  resolve(Response.json({ roomId: "room" }));
  assert.deepEqual(await Promise.all([first, second]), ["room", "room"]);
});

test("different accounts, codes and expected rooms do not share a join", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () => Response.json({ roomId: "room" }));
  await Promise.all([
    joinDrawGuessRoomPending({ profileId: "one", code: "ABCDEF" }),
    joinDrawGuessRoomPending({ profileId: "two", code: "ABCDEF" }),
    joinDrawGuessRoomPending({ profileId: "one", code: "GHIJKL" }),
    joinDrawGuessRoomPending({ profileId: "one", code: "ABCDEF", expectedRoomId: "room" }),
  ]);
  assert.equal(fetchMock.mock.callCount(), 4);
});

test("settled successful joins are not reused after a later leave", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () => Response.json({ roomId: "room" }));
  const input = { profileId: "one", code: "ABCDEF" };
  await joinDrawGuessRoomPending(input);
  await joinDrawGuessRoomPending(input);
  assert.equal(fetchMock.mock.callCount(), 2);
});

test("a failed join is evicted so an explicit retry can recover", async (t) => {
  let attempts = 0;
  t.mock.method(globalThis, "fetch", async () => ++attempts === 1
    ? Response.json({ error: "UNAVAILABLE" }, { status: 503 }) : Response.json({ roomId: "room" }));
  const input = { profileId: "one", code: "ABCDEF" };
  await assert.rejects(joinDrawGuessRoomPending(input), /UNAVAILABLE/);
  assert.equal(await joinDrawGuessRoomPending(input), "room");
  assert.equal(attempts, 2);
});

test("a recent-room join does not navigate to a different room returned for the code", async (t) => {
  t.mock.method(globalThis, "fetch", async () => Response.json({ roomId: "another-room" }));
  await assert.rejects(joinDrawGuessRoomPending({ profileId: "one", code: "ABCDEF", expectedRoomId: "original-room" }), /ROOM_NOT_FOUND/);
});

test("a recent-room join sends its identity before the server can restore membership", async (t) => {
  let body: unknown;
  t.mock.method(globalThis, "fetch", async (_url: RequestInfo | URL, init?: RequestInit) => {
    body = JSON.parse(String(init?.body));
    return Response.json({ error: "ROOM_NOT_FOUND" }, { status: 409 });
  });
  await assert.rejects(joinDrawGuessRoomPending({ profileId: "one", code: " abcdef ", expectedRoomId: "original-room" }), /ROOM_NOT_FOUND/);
  assert.deepEqual(body, { code: "ABCDEF", expectedRoomId: "original-room" });
});
