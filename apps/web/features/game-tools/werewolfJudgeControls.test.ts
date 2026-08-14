import assert from "node:assert/strict";
import test from "node:test";
import {
  countAliveWerewolfPlayers,
  isWerewolfJudgeViewer,
} from "./werewolfJudgeControls";

test("recognizes the judge from either the seat flag or current member seat", () => {
  const judgeSeat = { isViewerSeat: false, seatNumber: 7 };

  assert.equal(
    isWerewolfJudgeViewer({ currentMemberSeatNumber: 7, judgeSeat }),
    true,
  );
  assert.equal(
    isWerewolfJudgeViewer({
      currentMemberSeatNumber: null,
      judgeSeat: { ...judgeSeat, isViewerSeat: true },
    }),
    true,
  );
  assert.equal(
    isWerewolfJudgeViewer({ currentMemberSeatNumber: 3, judgeSeat }),
    false,
  );
});

test("counts only claimed player seats that remain alive", () => {
  assert.equal(
    countAliveWerewolfPlayers([
      { isClaimed: true, isDead: false, isPlayerSeat: true },
      { isClaimed: true, isDead: true, isPlayerSeat: true },
      { isClaimed: false, isDead: false, isPlayerSeat: true },
      { isClaimed: true, isDead: false, isPlayerSeat: false },
    ]),
    1,
  );
});
