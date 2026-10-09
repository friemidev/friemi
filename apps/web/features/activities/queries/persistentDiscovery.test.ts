import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  activityCardSelect,
  findDiscoveryActivityCards,
  getActivityTimeStateWhere,
  getVisibleActivityWhere,
} from "./getActivities";

const stamp = (day: string) => new Date(`2026-10-${day}T12:00:00Z`);

test("discovery merges the full filtered index before fetching one stable page", async (t) => {
  const index = [
    {
      id: "soon",
      isPersistent: false,
      createdAt: stamp("08"),
      lastBookingAt: null,
    },
    {
      id: "old-space",
      isPersistent: true,
      createdAt: stamp("01"),
      lastBookingAt: null,
    },
    {
      id: "later",
      isPersistent: false,
      createdAt: stamp("03"),
      lastBookingAt: null,
    },
    {
      id: "active-space",
      isPersistent: true,
      createdAt: stamp("01"),
      lastBookingAt: stamp("07"),
    },
  ];
  const where: Prisma.ActivityWhereInput = {
    AND: [getVisibleActivityWhere(), { city: "Paris" }],
  };
  const calls: Prisma.ActivityFindManyArgs[] = [];
  const original = prisma.activity.findMany;
  prisma.activity.findMany = (async (args: Prisma.ActivityFindManyArgs) => {
    calls.push(args);
    if (args.select === activityCardSelect) return [...index].reverse();
    return index;
  }) as unknown as typeof original;
  t.after(() => {
    prisma.activity.findMany = original;
  });
  const first = await findDiscoveryActivityCards({
    where,
    orderBy: [{ startAt: "asc" }, { id: "asc" }],
    select: activityCardSelect,
    take: 2,
  });
  const second = await findDiscoveryActivityCards({
    where,
    orderBy: [{ startAt: "asc" }, { id: "asc" }],
    select: activityCardSelect,
    skip: 2,
    take: 2,
  });
  assert.deepEqual(
    first.map((row) => row.id),
    ["soon", "active-space"],
  );
  assert.deepEqual(
    second.map((row) => row.id),
    ["later", "old-space"],
  );
  assert.equal(calls[0].where, where);
  assert.equal(calls[0].skip, undefined);
  assert.equal(calls[0].take, undefined);
  assert.deepEqual(calls[0].select, {
    id: true,
    isPersistent: true,
    lastBookingAt: true,
    createdAt: true,
  });
  assert.deepEqual(calls[3].where, {
    AND: [where, { id: { in: ["later", "old-space"] } }],
  });
});

test("date expiration cannot put persistent booking spaces into the ended query", () => {
  const ended = getActivityTimeStateWhere("ENDED");
  assert.deepEqual((ended.AND as Prisma.ActivityWhereInput[])[0], {
    isPersistent: false,
  });
  const ongoing = getActivityTimeStateWhere("ONGOING");
  assert.equal(ongoing.OR?.[1].isPersistent, true);
  const visible = getVisibleActivityWhere({ includePast: false });
  assert.equal(visible.OR?.[1].isPersistent, true);
  assert.equal(
    getVisibleActivityWhere({ visibility: ["PRIVATE"] }).isPersistent,
    false,
  );
});
