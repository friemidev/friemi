import assert from "node:assert/strict";
import test from "node:test";
import { canLeaveWerewolfOccupancy } from "./werewolfRoomAccess";

test("a validated private seat token can leave after the login session expires", () => {
  assert.equal(
    canLeaveWerewolfOccupancy({
      hasPrivateToken: true,
      memberProfileId: "profile-1",
      seatProfileId: "profile-1",
      viewerProfileId: null,
    }),
    true,
  );
});

test("a matching signed-in profile can leave without a private token", () => {
  assert.equal(
    canLeaveWerewolfOccupancy({
      hasPrivateToken: false,
      memberProfileId: "profile-1",
      seatProfileId: "profile-1",
      viewerProfileId: "profile-1",
    }),
    true,
  );
});

test("another or missing profile cannot leave a protected seat without its token", () => {
  assert.equal(
    canLeaveWerewolfOccupancy({
      hasPrivateToken: false,
      memberProfileId: "profile-1",
      seatProfileId: "profile-1",
      viewerProfileId: "profile-2",
    }),
    false,
  );
  assert.equal(
    canLeaveWerewolfOccupancy({
      hasPrivateToken: false,
      memberProfileId: "profile-1",
      seatProfileId: "profile-1",
      viewerProfileId: null,
    }),
    false,
  );
});
