import assert from "node:assert/strict";
import test from "node:test";
import { getMomentLinkableActivityWhere } from "./momentActivityLinkPolicy";

test("moment activities are limited to created or joined meetups", () => {
  assert.deepEqual(getMomentLinkableActivityWhere("profile-1"), {
    status: { notIn: ["DRAFT", "CANCELLED"] },
    OR: [
      { organizerId: "profile-1" },
      {
        participants: {
          some: {
            userProfileId: "profile-1",
            status: { in: ["JOINED", "APPROVED"] },
          },
        },
      },
    ],
  });
});
