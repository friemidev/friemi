import assert from "node:assert/strict";
import test from "node:test";
import {
  buildProfileVisitorViewModels,
  getProfileVisitDate,
  recordProfileVisit,
  selectRecentProfileVisitRows,
} from "./profileVisits";

test("profile visit date is normalized to a UTC day", () => {
  assert.equal(
    getProfileVisitDate(new Date("2026-07-24T23:59:59Z")).toISOString(),
    "2026-07-24T00:00:00.000Z",
  );
});

test("profile visit recording no-ops for guests and self visits", async () => {
  assert.deepEqual(
    await recordProfileVisit({ profileId: "p1", visitorId: null }),
    {
      recorded: false,
      reason: "GUEST",
    },
  );
  assert.deepEqual(
    await recordProfileVisit({ profileId: "p1", visitorId: "p1" }),
    {
      recorded: false,
      reason: "SELF_VISIT",
    },
  );
});

test("profile visitor list keeps the latest visit per visitor", () => {
  const rows = [
    {
      id: "visit-latest-v2",
      lastVisitedAt: new Date("2026-07-24T12:00:00Z"),
      viewCount: 2,
      visitorId: "v2",
      visitor: {
        id: "v2",
        avatarUrl: null,
        friendCode: "222222",
        nickname: "Visitor 2",
      },
    },
    {
      id: "visit-latest-v3",
      lastVisitedAt: new Date("2026-07-24T11:00:00Z"),
      viewCount: 1,
      visitorId: "v3",
      visitor: {
        id: "v3",
        avatarUrl: null,
        friendCode: "333333",
        nickname: "Visitor 3",
      },
    },
    {
      id: "visit-old-v2",
      lastVisitedAt: new Date("2026-07-23T10:00:00Z"),
      viewCount: 1,
      visitorId: "v2",
      visitor: {
        id: "v2",
        avatarUrl: null,
        friendCode: "222222",
        nickname: "Visitor 2",
      },
    },
  ];

  assert.deepEqual(
    selectRecentProfileVisitRows(rows, 2).map((row) => row.id),
    ["visit-latest-v2", "visit-latest-v3"],
  );
});

test("profile visitor list marks friendship without exposing detailed trails", () => {
  const rows = [
    {
      id: "visit-friend",
      lastVisitedAt: new Date("2026-07-24T12:34:00Z"),
      viewCount: 3,
      visitorId: "visitor-friend",
      visitor: {
        id: "visitor-friend",
        avatarUrl: "https://example.com/avatar.png",
        friendCode: "111111",
        nickname: "Ami",
      },
    },
    {
      id: "visit-stranger",
      lastVisitedAt: new Date("2026-07-24T12:00:00Z"),
      viewCount: 1,
      visitorId: "visitor-stranger",
      visitor: {
        id: "visitor-stranger",
        avatarUrl: null,
        friendCode: "222222",
        nickname: " ",
      },
    },
  ];

  assert.deepEqual(
    buildProfileVisitorViewModels({
      friendships: [
        {
          userAId: "profile",
          userBId: "visitor-friend",
        },
      ],
      profileId: "profile",
      visitors: rows,
    }),
    [
      {
        id: "visit-friend",
        isFriend: true,
        lastVisitedAt: "2026-07-24T12:34:00.000Z",
        viewCount: 3,
        visitor: {
          id: "visitor-friend",
          avatarUrl: "https://example.com/avatar.png",
          friendCode: "111111",
          nickname: "Ami",
        },
      },
      {
        id: "visit-stranger",
        isFriend: false,
        lastVisitedAt: "2026-07-24T12:00:00.000Z",
        viewCount: 1,
        visitor: {
          id: "visitor-stranger",
          avatarUrl: null,
          friendCode: "222222",
          nickname: "222222",
        },
      },
    ],
  );
});
