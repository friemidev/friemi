import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@prisma/client";
import {
  getBookingEntryStateInDatabase,
  getUnreadBookingCountInDatabase,
  markCustomerBookingsSeenInDatabase,
} from "./bookingBadge";

function badgeDb(
  input: {
    unreadCount?: number;
    booking?: boolean;
    legacySignup?: boolean;
  } = {},
) {
  const queries: Array<{ model: string; kind: string; args: unknown }> = [];
  const db = {
    merchantBookingReservation: {
      count: async (args: unknown) => {
        queries.push({ model: "reservation", kind: "count", args });
        return input.unreadCount ?? 0;
      },
      findFirst: async (args: unknown) => {
        queries.push({ model: "reservation", kind: "findFirst", args });
        return input.booking ? { id: "booking" } : null;
      },
    },
    merchantResidencySignup: {
      findFirst: async (args: unknown) => {
        queries.push({ model: "legacy", kind: "findFirst", args });
        return input.legacySignup ? { id: "signup" } : null;
      },
    },
  } as unknown as Prisma.TransactionClient;
  return { db, queries };
}

test("a customer with no current or legacy reservation has no booking entry", async () => {
  const { db, queries } = badgeDb();
  assert.deepEqual(await getBookingEntryStateInDatabase(db, "customer"), {
    hasBookingHistory: false,
    unreadBookingCount: 0,
  });
  assert.deepEqual(queries, [
    {
      model: "reservation",
      kind: "count",
      args: { where: { profileId: "customer", customerSeenAt: null } },
    },
    {
      model: "reservation",
      kind: "findFirst",
      args: { where: { profileId: "customer" }, select: { id: true } },
    },
    {
      model: "legacy",
      kind: "findFirst",
      args: { where: { profileId: "customer" }, select: { id: true } },
    },
  ]);
});

test("read, past, rejected or cancelled booking history keeps the entry without a red dot", async () => {
  const { db, queries } = badgeDb({ booking: true });
  assert.deepEqual(await getBookingEntryStateInDatabase(db, "customer"), {
    hasBookingHistory: true,
    unreadBookingCount: 0,
  });
  // No date or status filter may hide a customer's previous reservation.
  assert.deepEqual(queries[1].args, {
    where: { profileId: "customer" },
    select: { id: true },
  });
});

test("legacy signup history alone also keeps the entry without creating an unread count", async () => {
  assert.deepEqual(
    await getBookingEntryStateInDatabase(
      badgeDb({ legacySignup: true }).db,
      "customer",
    ),
    { hasBookingHistory: true, unreadBookingCount: 0 },
  );
});

test("only this customer's unseen bookings are counted, in every status", async () => {
  const { db, queries } = badgeDb({ unreadCount: 2 });
  assert.equal(await getUnreadBookingCountInDatabase(db, "customer"), 2);
  assert.deepEqual(queries[0].args, {
    where: { profileId: "customer", customerSeenAt: null },
  });
  assert.deepEqual(await getBookingEntryStateInDatabase(db, "customer"), {
    hasBookingHistory: true,
    unreadBookingCount: 2,
  });
});

function seenDb() {
  const queries: Array<{ sql: string; values: unknown[] }> = [];
  const db = {
    $executeRaw: async (
      strings: TemplateStringsArray,
      ...values: unknown[]
    ) => {
      queries.push({ sql: strings.join("?"), values });
      return 3;
    },
  } as unknown as Prisma.TransactionClient;
  return { db, queries };
}

test("marking seen only changes this customer's unseen records that existed when the page opened", async () => {
  const { db, queries } = seenDb();
  const openedAt = new Date("2026-10-09T12:00:00.000Z");
  const now = new Date("2026-10-09T12:00:03.000Z");
  assert.equal(
    await markCustomerBookingsSeenInDatabase(db, {
      profileId: "customer",
      openedAt,
      now,
    }),
    3,
  );
  assert.deepEqual(queries[0].values, [now, "customer", openedAt]);
  const normalized = queries[0].sql.replace(/\s+/g, " ").trim();
  assert.equal(
    normalized,
    'UPDATE "MerchantBookingReservation" SET "customerSeenAt" = ? WHERE "profileId" = ? AND "customerSeenAt" IS NULL AND "updatedAt" <= ?',
  );
  // SET must not change @updatedAt, otherwise merely reading would look like a business update.
  assert.equal(
    normalized
      .slice(normalized.indexOf("SET"), normalized.indexOf("WHERE"))
      .includes("updatedAt"),
    false,
  );
});

test("a future page timestamp is capped at the server clock", async () => {
  const { db, queries } = seenDb();
  const now = new Date("2026-10-09T12:00:00.000Z");
  await markCustomerBookingsSeenInDatabase(db, {
    profileId: "customer",
    openedAt: new Date("2050-01-01T00:00:00.000Z"),
    now,
  });
  assert.deepEqual(queries[0].values, [now, "customer", now]);
});

test("invalid opening timestamps cannot clear any bookings", async () => {
  const { db, queries } = seenDb();
  await assert.rejects(
    markCustomerBookingsSeenInDatabase(db, {
      profileId: "customer",
      openedAt: new Date("invalid"),
      now: new Date(),
    }),
    /Invalid booking view timestamp/,
  );
  assert.equal(queries.length, 0);
});
