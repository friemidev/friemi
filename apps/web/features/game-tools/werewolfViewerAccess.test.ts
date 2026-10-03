import assert from "node:assert/strict";
import test from "node:test";

import { getWerewolfViewerAccessScope } from "@/features/game-tools/werewolfViewerAccess";

test("changes the viewer scope when a judge becomes a spectator", () => {
  const judgeScope = getWerewolfViewerAccessScope({
    currentMember: { id: "member-1", seatedSeatId: "judge-seat" },
    seats: [{ id: "judge-seat", isJudgeSeat: true, isViewerSeat: true }],
  });
  const spectatorScope = getWerewolfViewerAccessScope({
    currentMember: { id: "member-1", seatedSeatId: null },
    seats: [{ id: "judge-seat", isJudgeSeat: true, isViewerSeat: false }],
  });

  assert.notEqual(judgeScope, spectatorScope);
});

test("keeps the viewer scope stable during ordinary room updates", () => {
  const firstScope = getWerewolfViewerAccessScope({
    currentMember: { id: "member-2", seatedSeatId: "seat-3" },
    seats: [{ id: "seat-3", isJudgeSeat: false, isViewerSeat: true }],
  });
  const nextScope = getWerewolfViewerAccessScope({
    currentMember: { id: "member-2", seatedSeatId: "seat-3" },
    seats: [
      { id: "seat-3", isJudgeSeat: false, isViewerSeat: true },
      { id: "seat-4", isJudgeSeat: false, isViewerSeat: false },
    ],
  });

  assert.equal(firstScope, nextScope);
});
