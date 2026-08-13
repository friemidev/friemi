import assert from "node:assert/strict";
import test from "node:test";
import {
  buildPlanetMomentCommentTargetWhere,
  buildPlanetMomentTargetWhere,
  canInteractWithPlanetMoment,
  canPublishPlanetMoment,
} from "./planetMomentPolicy";

test("planet moment interaction requires an approved membership", () => {
  assert.equal(
    canInteractWithPlanetMoment({ role: "MEMBER", status: "APPROVED" }),
    true,
  );
  assert.equal(
    canInteractWithPlanetMoment({ role: "OWNER", status: "PENDING" }),
    false,
  );
  assert.equal(canInteractWithPlanetMoment(null), false);
});

test("only an approved owner can publish a planet moment", () => {
  assert.equal(
    canPublishPlanetMoment({ role: "OWNER", status: "APPROVED" }),
    true,
  );
  assert.equal(
    canPublishPlanetMoment({ role: "ADMIN", status: "APPROVED" }),
    false,
  );
  assert.equal(
    canPublishPlanetMoment({ role: "OWNER", status: "PENDING" }),
    false,
  );
});

test("moment interaction targets are always scoped to their planet", () => {
  assert.deepEqual(buildPlanetMomentTargetWhere("moment-1", "planet-1"), {
    id: "moment-1",
    planetId: "planet-1",
  });
  assert.deepEqual(
    buildPlanetMomentCommentTargetWhere("comment-1", "planet-1"),
    {
      id: "comment-1",
      moment: { planetId: "planet-1" },
    },
  );
});
