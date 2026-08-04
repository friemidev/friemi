import assert from "node:assert/strict";
import test from "node:test";
import {
  getRealParticipationProfileIds,
  resolveSuccessfulActivityRewardEligibility,
  type RewardActivitySnapshot,
} from "./socialRewardTriggers";

const endedAt = new Date("2026-07-24T20:00:00.000Z");
const now = new Date("2026-07-25T12:00:00.000Z");

function createActivity(
  overrides: Partial<RewardActivitySnapshot> = {},
): RewardActivitySnapshot {
  return {
    endAt: endedAt,
    guestParticipants: [],
    id: "activity-1",
    organizerId: "organizer-1",
    participants: [
      {
        checkedInAt: null,
        status: "APPROVED",
        userProfileId: "organizer-1",
      },
      {
        checkedInAt: null,
        status: "APPROVED",
        userProfileId: "guest-1",
      },
    ],
    startAt: new Date("2026-07-24T18:00:00.000Z"),
    status: "RECRUITING",
    type: "USER_HOSTED",
    ...overrides,
  };
}

test("successful activity reward requires an ended non-public activity with two real people", () => {
  const eligibility = resolveSuccessfulActivityRewardEligibility(
    createActivity(),
    now,
  );

  assert.equal(eligibility.eligible, true);
  assert.deepEqual(eligibility.participantProfileIds, [
    "organizer-1",
    "guest-1",
  ]);
});

test("successful activity reward rejects public events, cancelled plans, and solo plans", () => {
  assert.equal(
    resolveSuccessfulActivityRewardEligibility(
      createActivity({ type: "PUBLIC_EVENT" }),
      now,
    ).reason,
    "PUBLIC_EVENT",
  );
  assert.equal(
    resolveSuccessfulActivityRewardEligibility(
      createActivity({ status: "CANCELLED" }),
      now,
    ).reason,
    "CANCELLED",
  );
  assert.equal(
    resolveSuccessfulActivityRewardEligibility(
      createActivity({
        participants: [
          {
            checkedInAt: null,
            status: "APPROVED",
            userProfileId: "organizer-1",
          },
          {
            checkedInAt: null,
            status: "PENDING",
            userProfileId: "pending-1",
          },
        ],
      }),
      now,
    ).reason,
    "TOO_FEW_PARTICIPANTS",
  );
});

test("ended plans without check-ins use active participation as fallback", () => {
  assert.deepEqual(getRealParticipationProfileIds(createActivity(), now), [
    "organizer-1",
    "guest-1",
  ]);
});

test("check-in based plans only count confirmed check-ins", () => {
  const beforeEnd = new Date("2026-07-24T19:00:00.000Z");
  const activity = createActivity({
    endAt: endedAt,
    participants: [
      {
        checkedInAt: new Date("2026-07-24T18:30:00.000Z"),
        status: "APPROVED",
        userProfileId: "checked-in",
      },
      {
        checkedInAt: null,
        status: "APPROVED",
        userProfileId: "not-yet",
      },
    ],
  });

  assert.deepEqual(getRealParticipationProfileIds(activity, beforeEnd), [
    "checked-in",
  ]);
  assert.deepEqual(getRealParticipationProfileIds(activity, now), [
    "checked-in",
  ]);
});

test("real participation fallback excludes cancelled check-ins", () => {
  const activity = createActivity({
    participants: [
      {
        checkInCancelledAt: new Date("2026-07-24T21:00:00.000Z"),
        checkInRequestedAt: null,
        checkedInAt: null,
        status: "APPROVED",
        userProfileId: "cancelled-check-in",
      },
      {
        checkInCancelledAt: null,
        checkInRequestedAt: null,
        checkedInAt: null,
        status: "APPROVED",
        userProfileId: "fallback",
      },
    ],
  });

  assert.deepEqual(getRealParticipationProfileIds(activity, now), [
  ]);
  const eligibility = resolveSuccessfulActivityRewardEligibility(activity, now);

  assert.equal(eligibility.eligible, false);
  assert.equal(eligibility.reason, "TOO_FEW_PARTICIPANTS");
  assert.deepEqual(eligibility.participantProfileIds, ["organizer-1"]);
});

test("linked guest signups count once and pending signups do not count", () => {
  const eligibility = resolveSuccessfulActivityRewardEligibility(
    createActivity({
      guestParticipants: [
        {
          linkedUserProfileId: "guest-1",
          status: "APPROVED",
        },
        {
          linkedUserProfileId: "pending-guest",
          status: "PENDING",
        },
      ],
      participants: [
        {
          checkedInAt: null,
          status: "APPROVED",
          userProfileId: "organizer-1",
        },
      ],
    }),
    now,
  );

  assert.equal(eligibility.eligible, true);
  assert.deepEqual(eligibility.participantProfileIds, [
    "organizer-1",
    "guest-1",
  ]);
});

test("linked guest fallback respects the linked participant check-in state", () => {
  const eligibility = resolveSuccessfulActivityRewardEligibility(
    createActivity({
      guestParticipants: [
        {
          linkedParticipant: {
            checkInCancelledAt: new Date("2026-07-24T21:00:00.000Z"),
            checkInRequestedAt: null,
            checkedInAt: null,
            status: "APPROVED",
            userProfileId: "guest-1",
          },
          linkedUserProfileId: "guest-1",
          status: "APPROVED",
        },
      ],
      participants: [
        {
          checkedInAt: null,
          status: "APPROVED",
          userProfileId: "organizer-1",
        },
      ],
    }),
    now,
  );

  assert.equal(eligibility.eligible, false);
  assert.equal(eligibility.reason, "TOO_FEW_PARTICIPANTS");
  assert.deepEqual(eligibility.participantProfileIds, ["organizer-1"]);
});
