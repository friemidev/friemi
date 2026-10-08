import assert from "node:assert/strict";
import test from "node:test";
import type { Prisma } from "@prisma/client";
import {
  buildResidencyCancellationNotifications,
  buildResidencyPublishedNotifications,
  buildResidencyReviewNotification,
  cancelResidencySlotAsAdmin,
  cancelResidencySlotInDatabase,
  publishResidencySlotInDatabase,
  reviewResidencySlot,
  signupForResidencySlotInDatabase,
} from "./service";

const confirmedSlot = {
  id: "slot-1",
  date: new Date("2050-07-20T00:00:00.000Z"),
  title: "Merchant residency",
  description: "Open gathering",
  status: "CONFIRMED",
  activityId: null,
  merchant: {
    id: "merchant-1",
    isActive: true,
    ownerProfileId: "owner-1",
    name: "The venue",
    city: "Paris",
    address: "1 rue de Paris",
    latitude: null,
    longitude: null,
    logoUrl: null,
  },
};

test("publishing transfers only active signups and includes the merchant owner once", async () => {
  const captured: {
    activityData?: {
      status: string;
      visibility: string;
      capacity: number;
      merchantId: string;
      address: string;
      startAt: Date;
      participants: { create: Array<{ userProfileId: string }> };
    };
    slotUpdate?: { where: unknown };
    notifications?: Array<{
      recipientId: string;
      type: string;
      activityId?: string | null;
    }>;
  } = {};
  const tx = {
    merchantResidencySlot: {
      findUnique: async () => confirmedSlot,
      updateMany: async (args: Record<string, unknown>) => {
        captured.slotUpdate = args as { where: unknown };
        return { count: 1 };
      },
    },
    merchantResidencySignup: {
      findMany: async () => [
        { profileId: "guest-1" },
        { profileId: "owner-1" },
        { profileId: "guest-2" },
      ],
    },
    activity: {
      create: async ({ data }: { data: Record<string, unknown> }) => {
        captured.activityData = data as unknown as NonNullable<
          typeof captured.activityData
        >;
        return { id: "activity-1" };
      },
    },
  } as unknown as Prisma.TransactionClient;

  const result = await publishResidencySlotInDatabase(
    tx,
    {
      actorProfileId: "owner-1",
      slotId: "slot-1",
      startTime: "19:30",
      address: "2 rue de test",
    },
    async (_tx, notifications) => {
      captured.notifications = notifications;
      return { count: notifications.length };
    },
  );
  assert.deepEqual(result, {
    status: "PUBLISHED",
    slotId: "slot-1",
    activityId: "activity-1",
  });
  assert.ok(captured.activityData);
  assert.ok(captured.slotUpdate);
  assert.equal(captured.activityData.status, "RECRUITING");
  assert.equal(captured.activityData.visibility, "PUBLIC");
  assert.equal(captured.activityData.capacity, 0);
  assert.equal(captured.activityData.merchantId, "merchant-1");
  assert.equal(captured.activityData.address, "2 rue de test");
  assert.equal(
    captured.activityData.startAt.toISOString(),
    "2050-07-20T19:30:00.000Z",
  );
  const participants = captured.activityData.participants.create;
  assert.deepEqual(
    participants.map((participant) => participant.userProfileId),
    ["owner-1", "guest-1", "guest-2"],
  );
  assert.deepEqual(captured.slotUpdate.where, {
    id: "slot-1",
    status: "CONFIRMED",
    activityId: null,
  });
  assert.equal(captured.notifications?.length, 3);
  assert.deepEqual(
    captured.notifications?.map((notification) => notification.recipientId),
    ["guest-1", "owner-1", "guest-2"],
  );
  assert.ok(
    captured.notifications?.every(
      (notification) =>
        notification.activityId === "activity-1" &&
        notification.type === "MERCHANT_BOOKING_PUBLISHED",
    ),
  );
});

test("a different account cannot publish the merchant's confirmed date", async () => {
  let created = false;
  const tx = {
    merchantResidencySlot: { findUnique: async () => confirmedSlot },
    activity: {
      create: async () => {
        created = true;
      },
    },
  } as unknown as Prisma.TransactionClient;
  assert.deepEqual(
    await publishResidencySlotInDatabase(tx, {
      actorProfileId: "stranger",
      slotId: "slot-1",
      startTime: "19:30",
      address: "2 rue de test",
    }),
    { status: "FORBIDDEN" },
  );
  assert.equal(created, false);
});

test("publishing requires an explicit usable venue address", async () => {
  const tx = {
    merchantResidencySlot: {
      findUnique: async () => {
        throw new Error("invalid address must stop before creating activity");
      },
    },
  } as unknown as Prisma.TransactionClient;
  assert.deepEqual(
    await publishResidencySlotInDatabase(tx, {
      actorProfileId: "owner-1",
      slotId: "slot-1",
      startTime: "19:30",
      address: "  ",
    }),
    { status: "INVALID" },
  );
});

test("publication only reuses store map coordinates at the store address", async () => {
  const addresses = ["1 rue de Paris", "2 rue de test"];
  const coordinates: Array<{ latitude: unknown; longitude: unknown }> = [];
  for (const address of addresses) {
    const tx = {
      merchantResidencySlot: {
        findUnique: async () => ({
          ...confirmedSlot,
          merchant: {
            ...confirmedSlot.merchant,
            latitude: 48.86,
            longitude: 2.35,
          },
        }),
        updateMany: async () => ({ count: 1 }),
      },
      merchantResidencySignup: { findMany: async () => [] },
      activity: {
        create: async ({
          data,
        }: {
          data: { latitude: unknown; longitude: unknown };
        }) => {
          coordinates.push({
            latitude: data.latitude,
            longitude: data.longitude,
          });
          return { id: "activity-1" };
        },
      },
    } as unknown as Prisma.TransactionClient;
    const result = await publishResidencySlotInDatabase(tx, {
      actorProfileId: "owner-1",
      slotId: "slot-1",
      startTime: "19:30",
      address,
    });
    assert.equal(result.status, "PUBLISHED");
  }
  assert.deepEqual(coordinates, [
    { latitude: 48.86, longitude: 2.35 },
    { latitude: null, longitude: null },
  ]);
});

test("publication checks the confirmed state at write time", async () => {
  const tx = {
    merchantResidencySlot: {
      findUnique: async () => confirmedSlot,
      updateMany: async () => ({ count: 0 }),
    },
    merchantResidencySignup: { findMany: async () => [] },
    activity: { create: async () => ({ id: "activity-1" }) },
  } as unknown as Prisma.TransactionClient;
  await assert.rejects(
    publishResidencySlotInDatabase(tx, {
      actorProfileId: "owner-1",
      slotId: "slot-1",
      startTime: "19:30",
      address: "2 rue de test",
    }),
    /changed during publication/,
  );
});

test("owner cancellation closes a confirmed date and retains signup rows as cancelled", async () => {
  let cancelledSignups = false;
  const tx = {
    merchantResidencySlot: {
      findUnique: async () => confirmedSlot,
      updateMany: async ({ where }: { where: { status: string } }) => {
        assert.equal(where.status, "CONFIRMED");
        return { count: 1 };
      },
    },
    merchantResidencySignup: {
      findMany: async () => [],
      updateMany: async ({
        where,
        data,
      }: {
        where: { status: string };
        data: { status: string; cancelledAt: Date };
      }) => {
        assert.equal(where.status, "ACTIVE");
        assert.equal(data.status, "CANCELLED");
        assert.ok(data.cancelledAt instanceof Date);
        cancelledSignups = true;
        return { count: 2 };
      },
    },
  } as unknown as Prisma.TransactionClient;
  assert.deepEqual(
    await cancelResidencySlotInDatabase(tx, {
      actorProfileId: "owner-1",
      slotId: "slot-1",
    }),
    { status: "CANCELLED", slotId: "slot-1" },
  );
  assert.equal(cancelledSignups, true);
});

test("admin can release a confirmed date after the store is disabled or reowned", async () => {
  let changedSignups = false;
  const tx = {
    merchantResidencySlot: {
      findUnique: async () => ({
        ...confirmedSlot,
        merchant: {
          ...confirmedSlot.merchant,
          isActive: false,
          ownerProfileId: "new-owner",
        },
      }),
      updateMany: async ({ where }: { where: { status: string } }) => {
        assert.equal(where.status, "CONFIRMED");
        return { count: 1 };
      },
    },
    merchantResidencySignup: {
      findMany: async () => [],
      updateMany: async () => {
        changedSignups = true;
        return { count: 2 };
      },
    },
  } as unknown as Prisma.TransactionClient;
  assert.deepEqual(
    await cancelResidencySlotInDatabase(tx, {
      actorProfileId: "admin-1",
      slotId: "slot-1",
      isAdmin: true,
    }),
    { status: "CANCELLED", slotId: "slot-1" },
  );
  assert.equal(changedSignups, true);
});

test("admin can release a pending date after the store is disabled or reowned", async () => {
  const tx = {
    merchantResidencySlot: {
      findUnique: async () => ({
        ...confirmedSlot,
        status: "PENDING",
        merchant: {
          ...confirmedSlot.merchant,
          isActive: false,
          ownerProfileId: "new-owner",
        },
      }),
      updateMany: async ({ where }: { where: { status: string } }) => {
        assert.equal(where.status, "PENDING");
        return { count: 1 };
      },
    },
    merchantResidencySignup: {
      updateMany: async () => ({ count: 0 }),
    },
  } as unknown as Prisma.TransactionClient;
  assert.deepEqual(
    await cancelResidencySlotInDatabase(tx, {
      actorProfileId: "admin-1",
      slotId: "slot-1",
      isAdmin: true,
    }),
    { status: "CANCELLED", slotId: "slot-1" },
  );
});

test("admin cancellation requires admin access and never cancels a published activity", async () => {
  assert.deepEqual(
    await cancelResidencySlotAsAdmin({
      actorProfileId: "person-1",
      slotId: "slot-1",
      isAdmin: false,
    }),
    { status: "FORBIDDEN" },
  );
  const tx = {
    merchantResidencySlot: {
      findUnique: async () => ({
        ...confirmedSlot,
        status: "PUBLISHED",
        activityId: "activity-1",
      }),
      updateMany: async () => {
        throw new Error("published slot must not be updated");
      },
    },
  } as unknown as Prisma.TransactionClient;
  assert.deepEqual(
    await cancelResidencySlotInDatabase(tx, {
      actorProfileId: "admin-1",
      slotId: "slot-1",
      isAdmin: true,
    }),
    { status: "CLOSED", slotId: "slot-1" },
  );
});

test("rejecting a reservation requires an explanation on the server", async () => {
  assert.deepEqual(
    await reviewResidencySlot({
      actorProfileId: "admin-1",
      isAdmin: true,
      slotId: "slot-1",
      decision: "reject",
      reason: "   ",
    }),
    { status: "INVALID" },
  );
});

test("cancellation notices target each active signup once with a stable dedupe event", () => {
  assert.deepEqual(
    buildResidencyCancellationNotifications({
      actorProfileId: "owner-1",
      slotId: "slot-1",
      recipientIds: ["guest-1", "guest-1", "guest-2"],
    }),
    ["guest-1", "guest-2"].map((recipientId) => ({
      actorId: "owner-1",
      dedupeIncludingRead: true,
      occurrenceId: "residency-cancel:slot-1",
      recipientId,
      residencySlotId: "slot-1",
      type: "MERCHANT_BOOKING_CANCELLED",
    })),
  );
});

test("review and publication notices identify their state and slot", () => {
  assert.deepEqual(
    buildResidencyReviewNotification({
      actorProfileId: "admin-1",
      recipientId: "owner-1",
      slotId: "slot-1",
      status: "REJECTED",
    }),
    {
      actorId: "admin-1",
      dedupeIncludingRead: true,
      occurrenceId: "residency-review:REJECTED:slot-1",
      recipientId: "owner-1",
      residencySlotId: "slot-1",
      type: "MERCHANT_BOOKING_REJECTED",
    },
  );
  assert.equal(
    buildResidencyPublishedNotifications({
      actorProfileId: "owner-1",
      activityId: "activity-1",
      slotId: "slot-1",
      recipientIds: ["guest-1", "guest-1"],
    }).length,
    1,
  );
});

test("store owner cannot sign up as an ordinary attendee for their own date", async () => {
  const tx = {
    merchantResidencySlot: {
      findUnique: async () => ({
        id: "slot-1",
        date: new Date("2050-07-20T00:00:00.000Z"),
        status: "CONFIRMED",
        merchant: { isActive: true, ownerProfileId: "owner-1" },
      }),
    },
    merchantResidencySignup: {
      create: async () => {
        throw new Error("owner must not receive a signup row");
      },
    },
  } as unknown as Prisma.TransactionClient;
  assert.deepEqual(
    await signupForResidencySlotInDatabase(tx, {
      actorProfileId: "owner-1",
      slotId: "slot-1",
    }),
    { status: "FORBIDDEN", slotId: "slot-1" },
  );
});
