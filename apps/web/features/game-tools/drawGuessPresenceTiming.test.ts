import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import { ModuleKind, ScriptTarget, transpileModule } from "typescript";
import * as timing from "./drawGuessPresenceTiming";

// Exercise the actual server handlers against a clock and membership store.
// No database, server-only runtime, or network is needed for these races.
const serverCode = transpileModule(readFileSync(new URL("./drawGuessRoomServer.ts", import.meta.url), "utf8"), {
  compilerOptions: { module: ModuleKind.CommonJS, target: ScriptTarget.ES2022 },
}).outputText;

function presenceServer() {
  const epoch = 1_000_000;
  const clock = { now: epoch };
  const member = { id: "member-a", roomId: "room-a", profileId: "player-a", lastSeenAt: new Date(epoch), leftAt: null as Date | null };
  let revision = 1;
  class ClockDate extends Date {
    constructor(value?: number | string) { super(value ?? clock.now); }
    static now() { return clock.now; }
  }
  type MemberWhere = { leftAt?: null; lastSeenAt?: { lt?: Date; lte?: Date } };
  type StaleFilter = { lastSeenAt: { lte: Date }; room: { status: string | { in: string[] } } };
  const prisma: Record<string, unknown> = {
    gameToolRoomMember: {
      async updateMany({ where, data }: { where: MemberWhere; data: { lastSeenAt?: Date; leftAt?: Date } }) {
        if (where.leftAt === null && member.leftAt !== null) return { count: 0 };
        if (where.lastSeenAt?.lt && member.lastSeenAt >= where.lastSeenAt.lt) return { count: 0 };
        if (where.lastSeenAt?.lte && member.lastSeenAt > where.lastSeenAt.lte) return { count: 0 };
        Object.assign(member, data);
        return { count: 1 };
      },
      async findMany({ where }: { where: { OR: StaleFilter[] } }) {
        const filter = where.OR.find((item) => typeof item.room.status !== "string" && item.room.status.in.includes("IN_PROGRESS"))!;
        return member.leftAt === null && member.lastSeenAt <= filter.lastSeenAt.lte
          ? [{ ...member, room: { status: "IN_PROGRESS" } }] : [];
      },
    },
    gameToolRoom: {
      async findUnique() {
        return {
          id: "room-a", kind: "DRAW_GUESS", status: "IN_PROGRESS", hostId: "player-a", revision,
          members: member.leftAt === null ? [member] : [], seats: [], config: null,
          state: { phase: "DRAW_GUESS", mode: "CLASSIC", scores: [0, 0] },
          drawGuessDeadlineAt: new Date(epoch + 100_000),
        };
      },
      async findMany() { return []; },
      async updateMany() { revision += 1; return { count: 1 }; },
    },
    async $transaction(work: (tx: unknown) => Promise<unknown>) { return work(prisma); },
    async $executeRaw() { return 0; },
  };
  const exports: Record<string, unknown> = {};
  runInNewContext(serverCode, {
    exports, module: { exports }, Date: ClockDate,
    require(name: string) {
      if (name === "./drawGuessPresenceTiming") return timing;
      if (name === "@/lib/prisma") return { prisma };
      if (name === "@/features/game-tools/drawGuessRealtimeServer") return { broadcastDrawGuessRoomChange: async () => {} };
      return {};
    },
  });
  const server = exports as {
    markDrawGuessPresenceDeparting: (roomId: string, profileId: string) => Promise<unknown>;
    getDrawGuessRoomView: (roomId: string, profileId: string, knownRevision?: number) => Promise<{ notModified?: boolean; error?: string }>;
    sweepDueDrawGuessRooms: (now: number) => Promise<{ scanned: number; errors: number }>;
    leaveDrawGuessRoom: (roomId: string, profileId: string) => Promise<{ ok?: boolean; error?: string }>;
  };
  return { server, member, at: (elapsed: number) => { clock.now = epoch + elapsed; return clock.now; } };
}

test("a departing tab allows a full connected poll and request budget before membership expires", () => {
  assert.ok(timing.DRAW_GUESS_DEPART_GRACE_MS >= timing.DRAW_GUESS_CONNECTED_POLL_MS + timing.DRAW_GUESS_REQUEST_TIMEOUT_MS + 2_000);
  assert.ok(timing.DRAW_GUESS_DEPART_GRACE_MS < timing.DRAW_GUESS_STALE_MS);
  assert.equal(timing.DRAW_GUESS_STALE_MS, 35_000);
});

test("closing a second tab cannot expire a member before the surviving tab's delayed safety poll", async () => {
  const { server, member, at } = presenceServer();
  at(1_000);
  await server.markDrawGuessPresenceDeparting("room-a", "player-a");

  // With the old eight-second grace, the shared member was removed here,
  // one second before the surviving connected tab's normal safety poll.
  const earlySweep = await server.sweepDueDrawGuessRooms(at(9_000));
  assert.equal(earlySweep.scanned, 0);
  assert.equal(member.leftAt, null);

  at(timing.DRAW_GUESS_CONNECTED_POLL_MS + timing.DRAW_GUESS_REQUEST_TIMEOUT_MS);
  const view = await server.getDrawGuessRoomView("room-a", "player-a", 1);
  assert.equal(view.notModified, true);
  assert.equal(view.error, undefined);
  assert.equal(member.leftAt, null);

  // The fresh heartbeat also defeats a sweep at the original departure limit.
  const laterSweep = await server.sweepDueDrawGuessRooms(at(1_000 + timing.DRAW_GUESS_DEPART_GRACE_MS));
  assert.equal(laterSweep.scanned, 0);
  assert.equal(member.leftAt, null);
});

test("the final departing page still becomes eligible for cleanup at twenty seconds", async () => {
  const { server, member, at } = presenceServer();
  at(1_000);
  await server.markDrawGuessPresenceDeparting("room-a", "player-a");
  const before = await server.sweepDueDrawGuessRooms(at(20_999));
  assert.equal(before.scanned, 0);
  assert.equal(member.leftAt, null);
  const after = await server.sweepDueDrawGuessRooms(at(21_000));
  assert.equal(after.scanned, 1);
  assert.equal(after.errors, 0);
  assert.notEqual(member.leftAt, null);
});

test("deliberate leave still removes membership immediately", async () => {
  const { server, member, at } = presenceServer();
  const leftAt = at(1_000);
  const result = await server.leaveDrawGuessRoom("room-a", "player-a");
  assert.equal(result.ok, true);
  assert.equal(member.leftAt?.getTime(), leftAt);
});
