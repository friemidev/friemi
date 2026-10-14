import assert from "node:assert/strict";
import test from "node:test";
import { prisma } from "@/lib/prisma";
import type { ActivityCardViewModel } from "@/features/activities/types";
import { attachLiveActivityFavoriteStates } from "./getViewerActivityFavorite";

test("cached home cards get current counts and viewer state without changing their order", async (t) => {
  const original = prisma.activity.findMany;
  let call: unknown;
  prisma.activity.findMany = (async (args: unknown) => {
    call = args;
    return [
      {
        id: "first",
        _count: { favorites: 5 },
        favorites: [{ id: "favorite" }],
      },
      { id: "second", _count: { favorites: 0 }, favorites: [] },
    ];
  }) as unknown as typeof original;
  t.after(() => {
    prisma.activity.findMany = original;
  });
  const cached = [
    { id: "second", favoriteCount: 20, isFavorited: true },
    { id: "first", favoriteCount: 1, isFavorited: false },
  ] as ActivityCardViewModel[];
  const result = await attachLiveActivityFavoriteStates(cached, "viewer");
  assert.deepEqual(
    result.map(({ id, favoriteCount, isFavorited }) => ({
      id,
      favoriteCount,
      isFavorited,
    })),
    [
      { id: "second", favoriteCount: 0, isFavorited: false },
      { id: "first", favoriteCount: 5, isFavorited: true },
    ],
  );
  assert.equal(cached[0].favoriteCount, 20);
  assert.equal(cached[1].isFavorited, false);
  assert.deepEqual(
    (call as { select: { favorites: { where: unknown } } }).select.favorites
      .where,
    { userProfileId: "viewer" },
  );
});

test("empty home lists do not trigger a favorite query", async (t) => {
  const original = prisma.activity.findMany;
  prisma.activity.findMany = (async () => {
    throw new Error("Unexpected query");
  }) as typeof original;
  t.after(() => {
    prisma.activity.findMany = original;
  });
  assert.deepEqual(await attachLiveActivityFavoriteStates([], null), []);
});
