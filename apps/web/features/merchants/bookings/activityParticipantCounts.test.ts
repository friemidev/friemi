import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  activityCardSelect,
  findDiscoveryActivityCards,
  getActivityCardViewModel,
} from "@/features/activities/queries/getActivities";
import { attachPersistentBookingParticipantCounts } from "./activityParticipantCounts";

test("ordinary activities do not request or replace booking participation", async (t) => {
  const original = prisma.merchantBookingReservation.groupBy;
  prisma.merchantBookingReservation.groupBy = (() => {
    assert.fail("ordinary activities must not query reservations");
  }) as typeof original;
  t.after(() => {
    prisma.merchantBookingReservation.groupBy = original;
  });
  const rows = [{ id: "ordinary", isPersistent: false, participantCount: 4 }];
  assert.equal(await attachPersistentBookingParticipantCounts(rows), rows);
});

test("booking counts sum people in accepted, current or future visits only", async (t) => {
  const original = prisma.merchantBookingReservation.groupBy;
  const calls: Prisma.MerchantBookingReservationGroupByArgs[] = [];
  prisma.merchantBookingReservation.groupBy = (async (
    args: Prisma.MerchantBookingReservationGroupByArgs,
  ) => {
    calls.push(args);
    return [{ settingsId: "bookings", _sum: { partySize: 7 } }];
  }) as unknown as typeof original;
  t.after(() => {
    prisma.merchantBookingReservation.groupBy = original;
  });

  const rows = await attachPersistentBookingParticipantCounts(
    [
      {
        id: "space",
        isPersistent: true,
        merchantBookingSettings: { id: "bookings" },
      },
      {
        id: "space-copy",
        isPersistent: true,
        merchantBookingSettings: { id: "bookings" },
      },
      {
        id: "empty",
        isPersistent: true,
        merchantBookingSettings: { id: "empty-bookings" },
      },
      { id: "ordinary", isPersistent: false, merchantBookingSettings: null },
    ],
    new Date("2026-10-09T22:30:00Z"),
  );
  assert.deepEqual(calls, [
    {
      by: ["settingsId"],
      where: {
        settingsId: { in: ["bookings", "empty-bookings"] },
        status: "ACCEPTED",
        date: { gte: new Date("2026-10-10T00:00:00Z") },
      },
      _sum: { partySize: true },
    },
  ]);
  assert.deepEqual(
    rows.map((row) => row.bookingParticipantCount),
    [7, 7, 0, undefined],
  );
});

test("discovery cards expose fresh booking people totals and clear them after cancellation", async (t) => {
  const originalFind = prisma.activity.findMany;
  const originalGroup = prisma.merchantBookingReservation.groupBy;
  const persistent = {
    id: "space",
    isPersistent: true,
    createdAt: new Date("2026-10-09T00:00:00Z"),
    lastBookingAt: null,
    merchantBookingSettings: { id: "bookings" },
    source: "MERCHANT_BOOKING",
    sourcePayload: null,
    _count: { participants: 40, guestParticipants: 20, favorites: 0 },
    participants: [],
    guestParticipants: [],
    capacity: 0,
  };
  const ordinary = {
    ...persistent,
    id: "ordinary",
    isPersistent: false,
    merchantBookingSettings: null,
    source: null,
    _count: { participants: 2, guestParticipants: 1, favorites: 0 },
  };
  prisma.activity.findMany = (async () => [
    persistent,
    ordinary,
  ]) as unknown as typeof originalFind;
  let acceptedPeople = 7;
  prisma.merchantBookingReservation.groupBy = (async () =>
    acceptedPeople
      ? [{ settingsId: "bookings", _sum: { partySize: acceptedPeople } }]
      : []) as unknown as typeof originalGroup;
  t.after(() => {
    prisma.activity.findMany = originalFind;
    prisma.merchantBookingReservation.groupBy = originalGroup;
  });

  const readCards = async () =>
    (await findDiscoveryActivityCards({ select: activityCardSelect })).map(
      getActivityCardViewModel,
    );
  const first = await readCards();
  assert.equal(first.find((card) => card.id === "space")?.participantCount, 7);
  assert.equal(
    first.find((card) => card.id === "ordinary")?.participantCount,
    3,
  );

  acceptedPeople = 0;
  const next = await readCards();
  assert.equal(next.find((card) => card.id === "space")?.participantCount, 0);
  assert.equal(
    next.find((card) => card.id === "ordinary")?.participantCount,
    3,
  );
});
