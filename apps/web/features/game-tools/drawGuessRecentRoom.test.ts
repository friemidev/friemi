import assert from "node:assert/strict";
import test from "node:test";
import { forgetDrawGuessRecentRoom, parseDrawGuessRecentRoom, readDrawGuessRecentRoom, rememberDrawGuessRecentRoom } from "./drawGuessRecentRoom";
import { ACTIVE_GAME_TOOL_ROOM_STORAGE_KEY } from "./activeGameToolRoomStorage";

test("recent room parsing rejects invalid and expired links", () => {
  const now = 1_000_000_000;
  const room = { id: "room", code: "ABC123", mode: "CLASSIC", visitedAt: now };
  assert.deepEqual(parseDrawGuessRecentRoom(JSON.stringify(room), now), room);
  for (const value of [null, "bad json", JSON.stringify({ ...room, code: "https://example.com" }),
    JSON.stringify({ ...room, mode: "OTHER" }), JSON.stringify({ ...room, visitedAt: now - 8 * 86_400_000 }),
    JSON.stringify({ ...room, visitedAt: now + 120_000 })]) {
    assert.equal(parseDrawGuessRecentRoom(value, now), null);
  }
});

test("recent rooms remain scoped to the player and invalidation cannot erase a newer room", () => {
  const values = new Map<string, string>();
  const events: string[] = [];
  const previous = Object.getOwnPropertyDescriptor(globalThis, "window");
  Object.defineProperty(globalThis, "window", { configurable: true, value: {
    localStorage: { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) },
    dispatchEvent: (event: Event) => { events.push(event.type); return true; },
  } });
  try {
    const first = { id: "first", code: "ABC123", mode: "CLASSIC" as const };
    const second = { id: "second", code: "DEF456", mode: "CHAIN" as const };
    rememberDrawGuessRecentRoom("player-a", first);
    rememberDrawGuessRecentRoom("player-b", second);
    assert.equal(readDrawGuessRecentRoom("player-a")?.id, first.id);
    assert.equal(readDrawGuessRecentRoom("player-b")?.id, second.id);
    assert.equal(readDrawGuessRecentRoom(null), null);
    rememberDrawGuessRecentRoom("player-a", second);
    values.set(ACTIVE_GAME_TOOL_ROOM_STORAGE_KEY, JSON.stringify({ ...second, kind: "DRAW_GUESS" }));
    forgetDrawGuessRecentRoom("player-a", first);
    assert.equal(readDrawGuessRecentRoom("player-a")?.id, second.id);
    assert.ok(values.has(ACTIVE_GAME_TOOL_ROOM_STORAGE_KEY));
    forgetDrawGuessRecentRoom("player-a", { code: second.code });
    assert.equal(readDrawGuessRecentRoom("player-a"), null);
    assert.equal(readDrawGuessRecentRoom("player-b")?.id, second.id);
    assert.equal(values.has(ACTIVE_GAME_TOOL_ROOM_STORAGE_KEY), false);
    // A late failure from A must not remove B's shortcut to the same room.
    values.set(ACTIVE_GAME_TOOL_ROOM_STORAGE_KEY, JSON.stringify({ ...second, kind: "DRAW_GUESS", profileId: "player-b" }));
    forgetDrawGuessRecentRoom("player-a", { id: second.id });
    assert.equal(JSON.parse(values.get(ACTIVE_GAME_TOOL_ROOM_STORAGE_KEY)!).profileId, "player-b");
    forgetDrawGuessRecentRoom("player-b", { id: second.id });
    assert.equal(values.has(ACTIVE_GAME_TOOL_ROOM_STORAGE_KEY), false);
    assert.ok(events.length > 0);
  } finally {
    if (previous) Object.defineProperty(globalThis, "window", previous);
    else Reflect.deleteProperty(globalThis, "window");
  }
});
