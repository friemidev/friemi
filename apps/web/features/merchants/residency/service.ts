import { Prisma } from "@prisma/client";
import {
  createNotification,
  createNotifications,
  type CreateNotificationInput,
} from "@/features/notifications/utils/createNotification";
import { prisma } from "@/lib/prisma";
import {
  isCurrentOrFutureResidencyDate,
  isFutureResidencyDate,
  getParisDateString,
  parseResidencyActivityTime,
  parseResidencyDate,
} from "./validation";

export type ResidencyServiceStatus =
  | "CREATED"
  | "CONFIRMED"
  | "REJECTED"
  | "CANCELLED"
  | "SIGNED_UP"
  | "ALREADY_SIGNED_UP"
  | "SIGNUP_CANCELLED"
  | "PUBLISHED"
  | "INVALID"
  | "PAST_DATE"
  | "DATE_TAKEN"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "CLOSED"
  | "STALE"
  | "FAILED";

export type ResidencyServiceResult = {
  status: ResidencyServiceStatus;
  slotId?: string;
  activityId?: string;
};

export function buildResidencyCancellationNotifications(input: {
  actorProfileId: string | null;
  slotId: string;
  recipientIds: string[];
}): CreateNotificationInput[] {
  return [...new Set(input.recipientIds)].map((recipientId) => ({
    actorId: input.actorProfileId,
    dedupeIncludingRead: true,
    occurrenceId: `residency-cancel:${input.slotId}`,
    recipientId,
    residencySlotId: input.slotId,
    type: "MERCHANT_BOOKING_CANCELLED",
  }));
}

export function buildResidencyRequestCancelledNotification(input: {
  actorProfileId: string | null;
  recipientId: string;
  slotId: string;
}): CreateNotificationInput {
  return {
    actorId: input.actorProfileId,
    dedupeIncludingRead: true,
    occurrenceId: `residency-request-cancel:${input.slotId}`,
    recipientId: input.recipientId,
    residencySlotId: input.slotId,
    type: "MERCHANT_BOOKING_REQUEST_CANCELLED",
  };
}

export function buildResidencyReviewNotification(input: {
  actorProfileId: string;
  recipientId: string;
  slotId: string;
  status: "CONFIRMED" | "REJECTED";
}): CreateNotificationInput {
  return {
    actorId: input.actorProfileId,
    dedupeIncludingRead: true,
    occurrenceId: `residency-review:${input.status}:${input.slotId}`,
    recipientId: input.recipientId,
    residencySlotId: input.slotId,
    type:
      input.status === "CONFIRMED"
        ? "MERCHANT_BOOKING_CONFIRMED"
        : "MERCHANT_BOOKING_REJECTED",
  };
}

export function buildResidencyPublishedNotifications(input: {
  actorProfileId: string;
  activityId: string;
  slotId: string;
  recipientIds: string[];
}): CreateNotificationInput[] {
  return [...new Set(input.recipientIds)].map((recipientId) => ({
    activityId: input.activityId,
    actorId: input.actorProfileId,
    dedupeIncludingRead: true,
    occurrenceId: `residency-published:${input.slotId}`,
    recipientId,
    residencySlotId: input.slotId,
    type: "MERCHANT_BOOKING_PUBLISHED",
  }));
}

function isPrismaError(error: unknown, code: string) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
  );
}

async function serializable<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      });
    } catch (error) {
      if (isPrismaError(error, "P2034") && attempt < 2) continue;
      throw error;
    }
  }
  throw new Error("Residency transaction retry exhausted");
}

export async function requestResidencySlot(input: {
  actorProfileId: string;
  date: string;
  title: string;
  description: string;
}): Promise<ResidencyServiceResult> {
  const date = parseResidencyDate(input.date);
  const title = input.title.trim();
  const description = input.description.trim();
  if (
    !date ||
    title.length < 2 ||
    title.length > 120 ||
    description.length > 2000
  ) {
    return { status: "INVALID" };
  }
  if (!isFutureResidencyDate(date)) return { status: "PAST_DATE" };

  try {
    return await serializable(async (tx) => {
      const merchant = await tx.merchant.findFirst({
        where: {
          isActive: true,
          ownerProfileId: input.actorProfileId,
          owner: { status: "ACTIVE" },
        },
        select: { id: true },
      });
      if (!merchant) return { status: "FORBIDDEN" };

      const slot = await tx.merchantResidencySlot.create({
        data: {
          merchantId: merchant.id,
          requestedByProfileId: input.actorProfileId,
          date,
          title,
          description,
        },
        select: { id: true },
      });
      return { status: "CREATED", slotId: slot.id };
    });
  } catch (error) {
    if (isPrismaError(error, "P2002")) return { status: "DATE_TAKEN" };
    throw error;
  }
}

export async function reviewResidencySlot(input: {
  actorProfileId: string;
  isAdmin: boolean;
  slotId: string;
  decision: "approve" | "reject";
  reason?: string;
}): Promise<ResidencyServiceResult> {
  if (!input.isAdmin) return { status: "FORBIDDEN" };
  const reason = input.reason?.trim().slice(0, 500) || null;
  if (input.decision === "reject" && !reason) return { status: "INVALID" };
  try {
    return await serializable(async (tx) => {
      const slot = await tx.merchantResidencySlot.findUnique({
        where: { id: input.slotId },
        select: {
          id: true,
          date: true,
          status: true,
          requestedByProfileId: true,
          merchant: { select: { isActive: true, ownerProfileId: true } },
        },
      });
      if (!slot) return { status: "NOT_FOUND" };
      if (slot.status !== "PENDING")
        return { status: "STALE", slotId: slot.id };
      if (
        !slot.merchant.isActive ||
        !slot.requestedByProfileId ||
        slot.merchant.ownerProfileId !== slot.requestedByProfileId
      ) {
        return { status: "CLOSED", slotId: slot.id };
      }
      if (!isFutureResidencyDate(slot.date)) {
        return { status: "PAST_DATE", slotId: slot.id };
      }

      const nextStatus =
        input.decision === "approve" ? "CONFIRMED" : "REJECTED";
      const updated = await tx.merchantResidencySlot.updateMany({
        where: { id: slot.id, status: "PENDING" },
        data: {
          status: nextStatus,
          reviewedByProfileId: input.actorProfileId,
          reviewedAt: new Date(),
          rejectionReason: nextStatus === "REJECTED" ? reason : null,
        },
      });
      if (updated.count !== 1) return { status: "STALE", slotId: slot.id };
      if (slot.requestedByProfileId) {
        await createNotification(
          tx,
          buildResidencyReviewNotification({
            actorProfileId: input.actorProfileId,
            recipientId: slot.requestedByProfileId,
            slotId: slot.id,
            status: nextStatus,
          }),
        );
      }
      return { status: nextStatus, slotId: slot.id };
    });
  } catch (error) {
    if (isPrismaError(error, "P2002")) return { status: "DATE_TAKEN" };
    throw error;
  }
}

export async function cancelResidencySlot(input: {
  actorProfileId: string;
  slotId: string;
}): Promise<ResidencyServiceResult> {
  return serializable((tx) => cancelResidencySlotInDatabase(tx, input));
}

export async function cancelResidencySlotAsAdmin(input: {
  actorProfileId: string;
  slotId: string;
  isAdmin: boolean;
}): Promise<ResidencyServiceResult> {
  if (!input.isAdmin) return { status: "FORBIDDEN" };
  return serializable((tx) =>
    cancelResidencySlotInDatabase(tx, { ...input, isAdmin: true }),
  );
}

export async function cancelResidencySlotInDatabase(
  tx: Prisma.TransactionClient,
  input: { actorProfileId: string | null; slotId: string; isAdmin?: boolean },
  notifyRequester: typeof createNotification = createNotification,
): Promise<ResidencyServiceResult> {
  const slot = await tx.merchantResidencySlot.findUnique({
    where: { id: input.slotId },
    select: {
      id: true,
      status: true,
      requestedByProfileId: true,
      merchant: { select: { isActive: true, ownerProfileId: true } },
    },
  });
  if (!slot) return { status: "NOT_FOUND" };
  if (
    !input.isAdmin &&
    (!input.actorProfileId ||
      !slot.merchant.isActive ||
      slot.merchant.ownerProfileId !== input.actorProfileId)
  ) {
    return { status: "FORBIDDEN" };
  }
  if (slot.status !== "PENDING" && slot.status !== "CONFIRMED") {
    return { status: "CLOSED", slotId: slot.id };
  }

  const activeSignupProfileIds =
    slot.status === "CONFIRMED"
      ? (
          await tx.merchantResidencySignup.findMany({
            where: { slotId: slot.id, status: "ACTIVE" },
            select: { profileId: true },
          })
        ).map((signup) => signup.profileId)
      : [];

  const cancelledAt = new Date();
  const updated = await tx.merchantResidencySlot.updateMany({
    where: { id: slot.id, status: slot.status },
    data: { status: "CANCELLED", cancelledAt },
  });
  if (updated.count !== 1) return { status: "STALE", slotId: slot.id };
  await tx.merchantResidencySignup.updateMany({
    where: { slotId: slot.id, status: "ACTIVE" },
    data: { status: "CANCELLED", cancelledAt },
  });
  if (activeSignupProfileIds.length > 0) {
    await createNotifications(
      tx,
      buildResidencyCancellationNotifications({
        actorProfileId: input.actorProfileId,
        slotId: slot.id,
        recipientIds: activeSignupProfileIds,
      }),
    );
  }
  if (
    slot.requestedByProfileId &&
    slot.requestedByProfileId !== input.actorProfileId
  ) {
    await notifyRequester(
      tx,
      buildResidencyRequestCancelledNotification({
        actorProfileId: input.actorProfileId,
        recipientId: slot.requestedByProfileId,
        slotId: slot.id,
      }),
    );
  }
  return { status: "CANCELLED", slotId: slot.id };
}

/** Closes unanswered requests after their Paris calendar date. */
export async function expirePastResidencySlots(now = new Date()) {
  const today = parseResidencyDate(getParisDateString(now));
  if (!today) throw new Error("Invalid Paris calendar date");

  let cancelled = 0;
  let examined = 0;
  for (let batch = 0; batch < 5; batch += 1) {
    const slots = await prisma.merchantResidencySlot.findMany({
      where: {
        date: { lt: today },
        status: "PENDING",
      },
      orderBy: [{ date: "asc" }, { id: "asc" }],
      take: 100,
      select: { id: true },
    });
    if (slots.length === 0) break;
    for (const slot of slots) {
      examined += 1;
      const result = await serializable((tx) =>
        cancelResidencySlotInDatabase(tx, {
          actorProfileId: null,
          isAdmin: true,
          slotId: slot.id,
        }),
      );
      if (result.status === "CANCELLED") cancelled += 1;
    }
  }
  const remaining = await prisma.merchantResidencySlot.count({
    where: {
      date: { lt: today },
      status: "PENDING",
    },
  });
  return { cancelled, examined, remaining };
}

export async function signupForResidencySlot(input: {
  actorProfileId: string;
  slotId: string;
}): Promise<ResidencyServiceResult> {
  try {
    return await serializable((tx) =>
      signupForResidencySlotInDatabase(tx, input),
    );
  } catch (error) {
    if (isPrismaError(error, "P2002")) {
      return { status: "ALREADY_SIGNED_UP", slotId: input.slotId };
    }
    throw error;
  }
}

export async function signupForResidencySlotInDatabase(
  tx: Prisma.TransactionClient,
  input: { actorProfileId: string; slotId: string },
): Promise<ResidencyServiceResult> {
  const slot = await tx.merchantResidencySlot.findUnique({
    where: { id: input.slotId },
    select: {
      id: true,
      date: true,
      status: true,
      merchant: { select: { isActive: true, ownerProfileId: true } },
    },
  });
  if (!slot) return { status: "NOT_FOUND" };
  if (
    slot.status !== "CONFIRMED" ||
    !slot.merchant.isActive ||
    !isCurrentOrFutureResidencyDate(slot.date)
  ) {
    return { status: "CLOSED", slotId: slot.id };
  }
  if (slot.merchant.ownerProfileId === input.actorProfileId) {
    return { status: "FORBIDDEN", slotId: slot.id };
  }
  const profile = await tx.userProfile.findFirst({
    where: { id: input.actorProfileId, status: "ACTIVE" },
    select: { id: true },
  });
  if (!profile) return { status: "FORBIDDEN" };

  const existing = await tx.merchantResidencySignup.findUnique({
    where: {
      slotId_profileId: { slotId: slot.id, profileId: profile.id },
    },
    select: { id: true, status: true },
  });
  if (existing?.status === "ACTIVE") {
    return { status: "ALREADY_SIGNED_UP", slotId: slot.id };
  }
  if (existing) {
    await tx.merchantResidencySignup.update({
      where: { id: existing.id },
      data: { status: "ACTIVE", cancelledAt: null },
    });
  } else {
    await tx.merchantResidencySignup.create({
      data: { slotId: slot.id, profileId: profile.id },
    });
  }
  return { status: "SIGNED_UP", slotId: slot.id };
}

export async function cancelResidencySignup(input: {
  actorProfileId: string;
  slotId: string;
}): Promise<ResidencyServiceResult> {
  return serializable((tx) => cancelResidencySignupInDatabase(tx, input));
}

export async function cancelResidencySignupInDatabase(
  tx: Prisma.TransactionClient,
  input: { actorProfileId: string; slotId: string },
): Promise<ResidencyServiceResult> {
  const slot = await tx.merchantResidencySlot.findUnique({
    where: { id: input.slotId },
    select: { id: true, date: true, status: true },
  });
  if (!slot) return { status: "NOT_FOUND" };
  if (
    slot.status !== "CONFIRMED" ||
    !isCurrentOrFutureResidencyDate(slot.date)
  ) {
    return { status: "CLOSED", slotId: slot.id };
  }
  const updated = await tx.merchantResidencySignup.updateMany({
    where: {
      slotId: slot.id,
      profileId: input.actorProfileId,
      status: "ACTIVE",
    },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
  return updated.count === 1
    ? { status: "SIGNUP_CANCELLED", slotId: slot.id }
    : { status: "NOT_FOUND", slotId: slot.id };
}

export async function publishResidencySlot(input: {
  actorProfileId: string;
  slotId: string;
  startTime: string;
  address: string;
}): Promise<ResidencyServiceResult> {
  return serializable((tx) => publishResidencySlotInDatabase(tx, input));
}

export async function publishResidencySlotInDatabase(
  tx: Prisma.TransactionClient,
  input: {
    actorProfileId: string;
    slotId: string;
    startTime: string;
    address: string;
  },
  notify: typeof createNotifications = createNotifications,
): Promise<ResidencyServiceResult> {
  const address = input.address.trim();
  if (!address || address.length > 300) return { status: "INVALID" };
  const slot = await tx.merchantResidencySlot.findUnique({
    where: { id: input.slotId },
    select: {
      id: true,
      date: true,
      title: true,
      description: true,
      status: true,
      activityId: true,
      merchant: {
        select: {
          id: true,
          isActive: true,
          ownerProfileId: true,
          name: true,
          city: true,
          address: true,
          latitude: true,
          longitude: true,
          logoUrl: true,
        },
      },
    },
  });
  if (!slot) return { status: "NOT_FOUND" };
  if (
    !slot.merchant.isActive ||
    slot.merchant.ownerProfileId !== input.actorProfileId
  ) {
    return { status: "FORBIDDEN" };
  }
  if (slot.status === "PUBLISHED" && slot.activityId) {
    return {
      status: "PUBLISHED",
      slotId: slot.id,
      activityId: slot.activityId,
    };
  }
  if (slot.status !== "CONFIRMED") {
    return { status: "CLOSED", slotId: slot.id };
  }
  const startAt = parseResidencyActivityTime(slot.date, input.startTime);
  if (!startAt) return { status: "INVALID", slotId: slot.id };

  const signups = await tx.merchantResidencySignup.findMany({
    where: { slotId: slot.id, status: "ACTIVE" },
    select: { profileId: true },
  });
  const participantIds = [
    ...new Set([
      input.actorProfileId,
      ...signups.map((signup) => signup.profileId),
    ]),
  ];
  const usesMerchantAddress = slot.merchant.address?.trim() === address;

  const activity = await tx.activity.create({
    data: {
      title: slot.title,
      description: slot.description,
      type: "LOCAL",
      category: "OTHER",
      city: slot.merchant.city,
      address,
      latitude: usesMerchantAddress ? slot.merchant.latitude : null,
      longitude: usesMerchantAddress ? slot.merchant.longitude : null,
      startAt,
      capacity: 0,
      priceType: "FREE",
      priceText: "免费",
      coverImageUrl: slot.merchant.logoUrl,
      status: "RECRUITING",
      visibility: "PUBLIC",
      organizerId: input.actorProfileId,
      merchantId: slot.merchant.id,
      source: "MERCHANT_RESIDENCY",
      participants: {
        create: participantIds.map((userProfileId) => ({
          userProfileId,
          status: "APPROVED" as const,
        })),
      },
    },
    select: { id: true },
  });
  const updated = await tx.merchantResidencySlot.updateMany({
    where: { id: slot.id, status: "CONFIRMED", activityId: null },
    data: {
      status: "PUBLISHED",
      activityId: activity.id,
      publishedAt: new Date(),
    },
  });
  if (updated.count !== 1)
    throw new Error("Residency changed during publication");
  if (signups.length > 0) {
    await notify(
      tx,
      buildResidencyPublishedNotifications({
        actorProfileId: input.actorProfileId,
        activityId: activity.id,
        slotId: slot.id,
        recipientIds: signups.map((signup) => signup.profileId),
      }),
    );
  }
  return { status: "PUBLISHED", slotId: slot.id, activityId: activity.id };
}
