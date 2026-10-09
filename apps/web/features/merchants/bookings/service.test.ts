import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@prisma/client";
import {
  cancelBookingInDatabase,
  reviewBookingInDatabase,
  saveBookingSettingsInDatabase,
  setBookingAccessInDatabase,
  submitBookingInDatabase,
} from "./service";

const future = new Date("2050-06-03T00:00:00Z");
const merchant = {
  id: "merchant",
  ownerProfileId: "owner",
  isActive: true,
  bookingAccessEnabled: true,
  owner: { status: "ACTIVE" },
  name: "Shop",
  city: "Paris",
  address: "1 rue",
  latitude: null,
  longitude: null,
};
const settings = {
  id: "settings",
  activityId: "activity",
  enabled: true,
  scheduleMode: "DAILY",
  startDate: new Date("2050-01-01T00:00:00Z"),
  endDate: null,
  weekdays: [],
  specificDates: [],
  closedDates: [],
  merchant,
  activity: {
    status: "RECRUITING",
    visibility: "PUBLIC",
    isPersistent: true,
    source: "MERCHANT_BOOKING",
  },
};
const input = {
  actorProfileId: "customer",
  activityId: "activity",
  date: "2050-06-03",
  partySize: 3,
  contactPhone: "+33 612345678",
};
const row = {
  id: "booking",
  settingsId: "settings",
  profileId: "customer",
  date: future,
  status: "PENDING",
  settings,
};

function submitDb(
  overrides: { settings?: unknown; existing?: unknown; profile?: unknown } = {},
) {
  const created: unknown[] = [];
  const updated: unknown[] = [];
  const db = {
    userProfile: {
      findFirst: async () =>
        overrides.profile === undefined
          ? { id: "customer", nickname: "Guest" }
          : overrides.profile,
    },
    merchantBookingSettings: {
      findUnique: async () => overrides.settings ?? settings,
    },
    merchantBookingReservation: {
      findFirst: async () => overrides.existing ?? null,
      create: async (data: unknown) => {
        created.push(data);
        return { id: "booking" };
      },
    },
    activity: {
      update: async (data: unknown) => {
        updated.push(data);
        return {};
      },
    },
  } as unknown as Prisma.TransactionClient;
  return { db, created, updated };
}

test("submission stores a pending reservation and contact privately, without activity participation", async () => {
  const { db, created, updated } = submitDb();
  const result = await submitBookingInDatabase(db, input);
  assert.equal(result.status, "CREATED");
  assert.equal(created.length, 1);
  assert.deepEqual(created[0], {
    data: {
      settingsId: "settings",
      profileId: "customer",
      date: future,
      partySize: 3,
      contactName: "Guest",
      contactPhone: "+33612345678",
      note: null,
    },
    select: { id: true },
  });
  assert.equal(updated.length, 1);
  assert.equal(result.notification?.recipientId, "owner");
  assert.equal(result.notification?.type, "MERCHANT_RESERVATION_REQUESTED");
  assert.equal(
    JSON.stringify(result.notification).includes("33612345678"),
    false,
  );
});

test("duplicate live booking is idempotent even if store pauses afterward", async () => {
  const { db, created, updated } = submitDb({
    settings: { ...settings, enabled: false },
    existing: { id: "booking" },
  });
  const result = await submitBookingInDatabase(db, input);
  assert.equal(result.status, "ALREADY_BOOKED");
  assert.equal(created.length, 0);
  assert.equal(updated.length, 0);
});

test("new bookings enforce grant, store/owner state and schedule on server", async () => {
  for (const value of [
    { ...settings, enabled: false },
    { ...settings, merchant: { ...merchant, bookingAccessEnabled: false } },
    { ...settings, merchant: { ...merchant, isActive: false } },
    { ...settings, merchant: { ...merchant, owner: { status: "SUSPENDED" } } },
    { ...settings, merchant: { ...merchant, ownerProfileId: null } },
    { ...settings, closedDates: [future] },
    { ...settings, activity: { ...settings.activity, status: "CANCELLED" } },
  ]) {
    const { db, created } = submitDb({ settings: value });
    assert.equal((await submitBookingInDatabase(db, input)).status, "CLOSED");
    assert.equal(created.length, 0);
  }
  const { db } = submitDb({ profile: null });
  assert.equal((await submitBookingInDatabase(db, input)).status, "FORBIDDEN");
});

test("invalid contact, party and old dates cannot reach persistence", async () => {
  for (const changes of [
    { contactPhone: "" },
    { partySize: 0 },
    { partySize: 1000 },
    { partySize: 1.5 },
    { date: "2050-02-30" },
  ]) {
    const { db, created } = submitDb();
    assert.equal(
      (await submitBookingInDatabase(db, { ...input, ...changes })).status,
      "INVALID",
    );
    assert.equal(created.length, 0);
  }
  assert.equal(
    (
      await submitBookingInDatabase(submitDb().db, {
        ...input,
        date: "2000-01-01",
      })
    ).status,
    "PAST_DATE",
  );
});

test("only current owner reviews; review remains possible after grant or schedule pause", async () => {
  const changes: unknown[] = [];
  const db = {
    merchantBookingReservation: {
      findUnique: async () => ({
        ...row,
        settings: {
          ...settings,
          enabled: false,
          merchant: { ...merchant, bookingAccessEnabled: false },
        },
      }),
      updateMany: async (args: unknown) => {
        changes.push(args);
        return { count: 1 };
      },
    },
  } as unknown as Prisma.TransactionClient;
  assert.equal(
    (
      await reviewBookingInDatabase(db, {
        actorProfileId: "stranger",
        bookingId: "booking",
        decision: "accept",
      })
    ).status,
    "FORBIDDEN",
  );
  assert.equal(changes.length, 0);
  const result = await reviewBookingInDatabase(db, {
    actorProfileId: "owner",
    bookingId: "booking",
    decision: "accept",
  });
  assert.equal(result.status, "ACCEPTED");
  assert.equal(result.notification?.recipientId, "customer");
  assert.equal(result.notification?.type, "MERCHANT_RESERVATION_ACCEPTED");
  assert.equal(changes.length, 1);
});

test("reject requires a reason and cannot overwrite cancelled or accepted reservations", async () => {
  const db = {
    merchantBookingReservation: {
      findUnique: async () => ({ ...row, status: "CANCELLED" }),
    },
  } as unknown as Prisma.TransactionClient;
  assert.equal(
    (
      await reviewBookingInDatabase(db, {
        actorProfileId: "owner",
        bookingId: "booking",
        decision: "reject",
      })
    ).status,
    "INVALID",
  );
  assert.equal(
    (
      await reviewBookingInDatabase(db, {
        actorProfileId: "owner",
        bookingId: "booking",
        decision: "reject",
        reason: "Closed",
      })
    ).status,
    "STALE",
  );
});

test("customer cancellation checks ownership and remains independent of meetup closure", async () => {
  const changes: unknown[] = [];
  const db = {
    userProfile: { findFirst: async () => ({ id: "customer" }) },
    merchantBookingReservation: {
      findUnique: async () => ({
        ...row,
        status: "ACCEPTED",
        settings: { ...settings, activity: { status: "CANCELLED" } },
      }),
      updateMany: async (data: unknown) => {
        changes.push(data);
        return { count: 1 };
      },
    },
  } as unknown as Prisma.TransactionClient;
  assert.equal(
    (
      await cancelBookingInDatabase(db, {
        actorProfileId: "stranger",
        bookingId: "booking",
      })
    ).status,
    "FORBIDDEN",
  );
  assert.equal(changes.length, 0);
  const result = await cancelBookingInDatabase(db, {
    actorProfileId: "customer",
    bookingId: "booking",
  });
  assert.equal(result.status, "CANCELLED");
  assert.equal(result.notification?.recipientId, "owner");
  assert.equal(changes.length, 1);
});

test("only active site admins can change booking access", async () => {
  const db = {
    userProfile: { findFirst: async () => null },
  } as unknown as Prisma.TransactionClient;
  assert.deepEqual(
    await setBookingAccessInDatabase(db, {
      actorProfileId: "owner",
      merchantId: "merchant",
      enabled: true,
    }),
    { status: "FORBIDDEN" },
  );
});

test("editing a schedule reuses its permanent meetup and leaves reservation history untouched", async () => {
  const activityUpdates: unknown[] = [];
  const settingUpdates: unknown[] = [];
  const db = {
    merchant: {
      findFirst: async () => ({ ...merchant, bookingSettings: settings }),
    },
    activity: {
      update: async (data: unknown) => {
        activityUpdates.push(data);
        return { id: "activity" };
      },
    },
    merchantBookingSettings: {
      update: async (data: unknown) => {
        settingUpdates.push(data);
      },
    },
  } as unknown as Prisma.TransactionClient;
  const result = await saveBookingSettingsInDatabase(db, {
    actorProfileId: "owner",
    enabled: false,
    scheduleMode: "WEEKLY",
    startDate: "2050-01-01",
    endDate: null,
    weekdays: [5, 6],
    specificDates: [],
    closedDates: [],
    title: "Visit us",
    description: "",
  });
  assert.equal(result.status, "SAVED");
  assert.equal(result.activityId, "activity");
  assert.equal(activityUpdates.length, 1);
  assert.equal(settingUpdates.length, 1);
});

test("first activation creates exactly one persistent public meetup and settings", async () => {
  const activities: Array<{ data: Record<string, unknown> }> = [];
  const configurations: Array<{ data: Record<string, unknown> }> = [];
  const db = {
    merchant: {
      findFirst: async () => ({ ...merchant, bookingSettings: null }),
    },
    activity: {
      create: async (args: { data: Record<string, unknown> }) => {
        activities.push(args);
        return { id: "activity" };
      },
    },
    merchantBookingSettings: {
      create: async (args: { data: Record<string, unknown> }) => {
        configurations.push(args);
        return { id: "settings" };
      },
    },
  } as unknown as Prisma.TransactionClient;
  const result = await saveBookingSettingsInDatabase(db, {
    actorProfileId: "owner",
    enabled: true,
    scheduleMode: "DATES",
    startDate: "2050-01-01",
    endDate: null,
    weekdays: [],
    specificDates: ["2050-06-03"],
    closedDates: [],
    title: "Visit us",
    description: "",
  });
  assert.equal(result.status, "SAVED");
  assert.equal(activities.length, 1);
  assert.equal(configurations.length, 1);
  assert.equal(activities[0].data.isPersistent, true);
  assert.equal(activities[0].data.source, "MERCHANT_BOOKING");
  assert.equal(activities[0].data.visibility, "PUBLIC");
  assert.equal("participants" in activities[0].data, false);
  assert.equal(configurations[0].data.activityId, "activity");
});

test("a stale review cannot emit an acceptance notice", async () => {
  const db = {
    merchantBookingReservation: {
      findUnique: async () => row,
      updateMany: async () => ({ count: 0 }),
    },
  } as unknown as Prisma.TransactionClient;
  assert.deepEqual(
    await reviewBookingInDatabase(db, {
      actorProfileId: "owner",
      bookingId: "booking",
      decision: "accept",
    }),
    { status: "STALE" },
  );
});

test("server-verified platform admins can grant access without a database admin role", async () => {
  let profileWhere: unknown;
  let merchantUpdate: unknown;
  const db = {
    userProfile: {
      findFirst: async ({ where }: { where: unknown }) => {
        profileWhere = where;
        return { id: "admin" };
      },
    },
    merchant: {
      findUnique: async () => ({ id: "merchant", bookingSettings: null }),
      update: async (args: unknown) => {
        merchantUpdate = args;
      },
    },
  } as unknown as Prisma.TransactionClient;
  const result = await setBookingAccessInDatabase(db, {
    actorProfileId: "admin",
    merchantId: "merchant",
    enabled: true,
    isAdmin: true,
  });
  assert.equal(result.status, "SAVED");
  assert.deepEqual(profileWhere, { id: "admin", status: "ACTIVE" });
  assert.deepEqual(merchantUpdate, {
    where: { id: "merchant" },
    data: { bookingAccessEnabled: true },
  });
});
