import assert from "node:assert/strict";
import test from "node:test";
import { ACTIVE_GAME_TOOL_ROOM_STORAGE_KEY as activeKey } from "./activeGameToolRoomStorage";
import { clearDdzRoomShortcuts } from "./doudizhuRoomStorage";

function cache() {
  const data = new Map<string, string>([
    [activeKey, JSON.stringify({ kind: "DOUDIZHU", id: "room-a" })],
    ["friemi:ddz:resume:alice", JSON.stringify({ id: "room-a" })],
    ["friemi:ddz:resume:bob", JSON.stringify({ id: "room-a" })],
  ]);
  return {
    data,
    getItem: (key: string) => data.get(key) ?? null,
    removeItem: (key: string) => {
      data.delete(key);
    },
  };
}
test("closed rooms clear the active shortcut and only the current account's recovery", () => {
  const storage = cache();
  assert.equal(clearDdzRoomShortcuts(storage, "alice", "room-a"), true);
  assert.equal(storage.getItem(activeKey), null);
  assert.equal(storage.getItem("friemi:ddz:resume:alice"), null);
  assert.ok(storage.getItem("friemi:ddz:resume:bob"));
});
test("leaving an active round keeps the account-bound seat recovery", () => {
  const storage = cache();
  assert.equal(clearDdzRoomShortcuts(storage, "alice", "room-a", true), true);
  assert.equal(storage.getItem(activeKey), null);
  assert.ok(storage.getItem("friemi:ddz:resume:alice"));
});
test("a stale room response cannot clear another room or game's shortcut", () => {
  const storage = cache();
  const before = [...storage.data];
  assert.equal(clearDdzRoomShortcuts(storage, "alice", "room-b"), false);
  assert.deepEqual([...storage.data], before);
  storage.data.set(activeKey, JSON.stringify({ kind: "UNO", id: "room-a" }));
  assert.equal(clearDdzRoomShortcuts(storage, "alice", "room-a"), false);
  assert.ok(storage.getItem(activeKey));
});
test("unavailable storage cannot block leaving or closing a room", () => {
  assert.equal(
    clearDdzRoomShortcuts(
      {
        getItem: () => {
          throw new Error("blocked");
        },
        removeItem: () => {
          throw new Error("blocked");
        },
      },
      "alice",
      "room-a",
    ),
    false,
  );
});
