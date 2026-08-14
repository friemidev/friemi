import assert from "node:assert/strict";
import test from "node:test";
import {
  buildWerewolfDerivedSyncVersion,
  buildWerewolfRevisionSyncVersion,
  getWerewolfSyncVersion,
} from "./werewolfSyncVersion";

test("werewolf sync version builds a compact monotonic revision", () => {
  assert.equal(
    buildWerewolfRevisionSyncVersion({ revision: 42, status: "PLAYING" }),
    "PLAYING:r42",
  );
});

test("werewolf sync version keeps the derived legacy version", () => {
  assert.match(
    buildWerewolfDerivedSyncVersion({
      finishedAt: null,
      latestEvent: null,
      startedAt: null,
      status: "LOBBY",
      updatedAt: new Date("2026-08-14T12:00:00.000Z"),
    }),
    /LOBBY:2026-08-14T12:00:00.000Z/,
  );
});

test("werewolf sync version defaults to the derived source", () => {
  const previousMode = process.env.PERF_B4_WEREWOLF_REVISION_MODE;
  process.env.PERF_B4_WEREWOLF_REVISION_MODE = "legacy";
  assert.deepEqual(
    getWerewolfSyncVersion({
      derived: "legacy-value",
      revision: 2,
      roomId: "room-1",
      status: "LOBBY",
    }),
    { mode: "legacy", source: "derived", value: "legacy-value" },
  );
  process.env.PERF_B4_WEREWOLF_REVISION_MODE = previousMode;
});
