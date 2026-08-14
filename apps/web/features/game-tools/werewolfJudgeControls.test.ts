import assert from "node:assert/strict";
import test from "node:test";
import {
  countAliveWerewolfPlayers,
  getWerewolfViewerPrivateToken,
  isWerewolfJudgeViewer,
} from "./werewolfJudgeControls";

test("keeps the viewer seat token available when a rejoined member record is missing", () => {
  assert.equal(
    getWerewolfViewerPrivateToken({
      currentMemberPrivateToken: null,
      viewerSeat: {
        isViewerSeat: true,
        privateToken: "viewer-private-token",
      },
    }),
    "viewer-private-token",
  );

  assert.equal(
    getWerewolfViewerPrivateToken({
      currentMemberPrivateToken: null,
      viewerSeat: {
        isViewerSeat: false,
        privateToken: "other-private-token",
      },
    }),
    null,
  );
});

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
