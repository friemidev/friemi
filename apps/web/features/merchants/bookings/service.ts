import { Prisma } from "@prisma/client";
import {
  createNotification,
  type CreateNotificationInput,
} from "@/features/notifications/utils/createNotification";
import { prisma } from "@/lib/prisma";
import {
  getBookingToday,
  isBookingDateOpen,
  normalizeBookingPhone,
  parseBookingDate,
  validateBookingSettings,
  type BookingSettingsInput,
} from "./validation";

export type BookingServiceStatus =
  | "SAVED"
  | "CREATED"
  | "ALREADY_BOOKED"
  | "ACCEPTED"
  | "REJECTED"
  | "CANCELLED"
  | "INVALID"
  | "PAST_DATE"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "CLOSED"
  | "STALE"
  | "FAILED";
export type BookingServiceResult = {
  status: BookingServiceStatus;
  bookingId?: string;
  activityId?: string;
  customerProfileId?: string;
};
type Outcome = BookingServiceResult & {
  notification?: CreateNotificationInput;
};
type Tx = Prisma.TransactionClient;

function isPrismaError(error: unknown, code: string) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError && error.code === code
  );
}

async function serializable(
  operation: (tx: Tx) => Promise<Outcome>,
): Promise<BookingServiceResult> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const { notification, ...result } = await operation(tx);
          // Persist the in-app notice atomically; the helper defers external delivery with after().
          if (notification) await createNotification(tx, notification);
          return result;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
    } catch (error) {
      if (
        (isPrismaError(error, "P2034") || isPrismaError(error, "P2002")) &&
        attempt < 2
      )
        continue;
      throw error;
    }
  }
  throw new Error("Booking transaction retries exhausted");
}

function notification(input: {
  type: CreateNotificationInput["type"];
  actorId: string;
  recipientId: string;
  bookingId: string;
}): CreateNotificationInput {
  return {
    type: input.type,
    actorId: input.actorId,
    recipientId: input.recipientId,
    merchantBookingId: input.bookingId,
    occurrenceId: `${input.type}:${input.bookingId}`,
    dedupeIncludingRead: true,
  };
}

function toSchedule(settings: {
  enabled: boolean;
  scheduleMode: "DAILY" | "WEEKLY" | "DATES";
  startDate: Date;
  endDate: Date | null;
  weekdays: number[];
  specificDates: Date[];
  closedDates: Date[];
}) {
  return {
    ...settings,
    startDate: settings.startDate.toISOString().slice(0, 10),
    endDate: settings.endDate?.toISOString().slice(0, 10) ?? null,
    specificDates: settings.specificDates.map((date) =>
      date.toISOString().slice(0, 10),
    ),
    closedDates: settings.closedDates.map((date) =>
      date.toISOString().slice(0, 10),
    ),
  };
}

export function saveBookingSettings(input: BookingSettingsInput) {
  return serializable((tx) => saveBookingSettingsInDatabase(tx, input));
}

export async function saveBookingSettingsInDatabase(
  tx: Tx,
  input: BookingSettingsInput,
): Promise<Outcome> {
  if (!validateBookingSettings(input)) return { status: "INVALID" };
  const merchant = await tx.merchant.findFirst({
    where: {
      ownerProfileId: input.actorProfileId,
      isActive: true,
      owner: { status: "ACTIVE" },
    },
    include: { bookingSettings: { include: { activity: true } } },
  });
  if (!merchant) return { status: "FORBIDDEN" };
  if (
    merchant.bookingSettings &&
    ["CANCELLED", "ENDED"].includes(merchant.bookingSettings.activity.status)
  )
    return { status: "CLOSED" };
  const activityData = {
    title: input.title.trim(),
    description: input.description.trim(),
    coverImageUrl: input.coverImageUrl?.trim() || null,
    organizerId: input.actorProfileId,
    city: merchant.city,
    address: merchant.address ?? "",
    latitude: merchant.latitude,
    longitude: merchant.longitude,
  };
  const activity = merchant.bookingSettings
    ? await tx.activity.update({
        where: { id: merchant.bookingSettings.activityId },
        data: activityData,
        select: { id: true },
      })
    : await tx.activity.create({
        data: {
          ...activityData,
          merchantId: merchant.id,
          source: "MERCHANT_BOOKING",
          isPersistent: true,
          type: "LOCAL",
          category: "OTHER",
          status: "RECRUITING",
          visibility: "PUBLIC",
          capacity: 0,
          startAt: parseBookingDate(input.startDate)!,
          priceType: "FREE",
          priceText: "",
          shareEnabled: true,
        },
        select: { id: true },
      });
  const settingsData = {
    enabled: input.enabled,
    scheduleMode: input.scheduleMode,
    startDate: parseBookingDate(input.startDate)!,
    endDate: input.endDate ? parseBookingDate(input.endDate) : null,
    weekdays: [...new Set(input.weekdays)].sort(),
    specificDates: [...new Set(input.specificDates)]
      .sort()
      .map((date) => parseBookingDate(date)!),
    closedDates: [...new Set(input.closedDates)]
      .sort()
      .map((date) => parseBookingDate(date)!),
  };
  if (merchant.bookingSettings) {
    await tx.merchantBookingSettings.update({
      where: { id: merchant.bookingSettings.id },
      data: settingsData,
    });
  } else {
    await tx.merchantBookingSettings.create({
      data: {
        ...settingsData,
        merchantId: merchant.id,
        activityId: activity.id,
        createdByProfileId: input.actorProfileId,
      },
    });
  }
  return { status: "SAVED", activityId: activity.id };
}

export type SubmitBookingInput = {
  actorProfileId: string;
  activityId: string;
  date: string;
  partySize: number;
  contactName?: string;
  contactPhone: string;
  note?: string;
};

export function submitBooking(input: SubmitBookingInput) {
  return serializable((tx) => submitBookingInDatabase(tx, input));
}

export async function submitBookingInDatabase(
  tx: Tx,
  input: SubmitBookingInput,
): Promise<Outcome> {
  const date = parseBookingDate(input.date);
  const phone = normalizeBookingPhone(input.contactPhone);
  if (
    !date ||
    !phone ||
    !Number.isInteger(input.partySize) ||
    input.partySize < 1 ||
    input.partySize > 999 ||
    (input.contactName?.trim().length ?? 0) > 80 ||
    (input.note?.trim().length ?? 0) > 1000
  )
    return { status: "INVALID" };
  if (input.date < getBookingToday()) return { status: "PAST_DATE" };
  const profile = await tx.userProfile.findFirst({
    where: { id: input.actorProfileId, status: "ACTIVE" },
    select: { id: true, nickname: true },
  });
  if (!profile) return { status: "FORBIDDEN" };
  const settings = await tx.merchantBookingSettings.findUnique({
    where: { activityId: input.activityId },
    include: {
      merchant: { include: { owner: { select: { status: true } } } },
      activity: {
        select: {
          status: true,
          visibility: true,
          isPersistent: true,
          source: true,
        },
      },
    },
  });
  if (!settings) return { status: "NOT_FOUND" };
  const existing = await tx.merchantBookingReservation.findFirst({
    where: {
      settingsId: settings.id,
      profileId: profile.id,
      date,
      status: { in: ["PENDING", "ACCEPTED"] },
    },
    select: { id: true },
  });
  if (existing)
    return {
      status: "ALREADY_BOOKED",
      bookingId: existing.id,
      activityId: settings.activityId,
      customerProfileId: profile.id,
      ...(settings.merchant.ownerProfileId
        ? {
            notification: notification({
              type: "MERCHANT_RESERVATION_REQUESTED",
              actorId: profile.id,
              recipientId: settings.merchant.ownerProfileId,
              bookingId: existing.id,
            }),
          }
        : {}),
    };
  if (
    !settings.merchant.isActive ||
    !settings.merchant.ownerProfileId ||
    settings.merchant.owner?.status !== "ACTIVE" ||
    settings.activity.status !== "RECRUITING" ||
    settings.activity.visibility !== "PUBLIC" ||
    !settings.activity.isPersistent ||
    settings.activity.source !== "MERCHANT_BOOKING" ||
    !isBookingDateOpen(toSchedule(settings), input.date)
  )
    return { status: "CLOSED" };
  const booking = await tx.merchantBookingReservation.create({
    data: {
      settingsId: settings.id,
      profileId: profile.id,
      date,
      partySize: input.partySize,
      contactName: input.contactName?.trim() || profile.nickname.slice(0, 80),
      contactPhone: phone,
      note: input.note?.trim() || null,
      customerSeenAt: null,
    },
    select: { id: true },
  });
  await tx.activity.update({
    where: { id: settings.activityId },
    data: { lastBookingAt: new Date() },
  });
  return {
    status: "CREATED",
    bookingId: booking.id,
    activityId: settings.activityId,
    customerProfileId: profile.id,
    notification: notification({
      type: "MERCHANT_RESERVATION_REQUESTED",
      actorId: profile.id,
      recipientId: settings.merchant.ownerProfileId,
      bookingId: booking.id,
    }),
  };
}

export type ReviewBookingInput = {
  actorProfileId: string;
  bookingId: string;
  decision: "accept" | "reject";
  reason?: string;
};

export function reviewBooking(input: ReviewBookingInput) {
  return serializable((tx) => reviewBookingInDatabase(tx, input));
}

export async function reviewBookingInDatabase(
  tx: Tx,
  input: ReviewBookingInput,
): Promise<Outcome> {
  const reason = input.reason?.trim() || null;
  if (
    !["accept", "reject"].includes(input.decision) ||
    (input.decision === "reject" && !reason) ||
    (reason?.length ?? 0) > 500
  )
    return { status: "INVALID" };
  const booking = await tx.merchantBookingReservation.findUnique({
    where: { id: input.bookingId },
    include: {
      settings: {
        include: {
          merchant: { include: { owner: { select: { status: true } } } },
        },
      },
    },
  });
  if (!booking) return { status: "NOT_FOUND" };
  const merchant = booking.settings.merchant;
  if (
    !merchant.isActive ||
    merchant.ownerProfileId !== input.actorProfileId ||
    merchant.owner?.status !== "ACTIVE"
  )
    return { status: "FORBIDDEN" };
  const nextStatus = input.decision === "accept" ? "ACCEPTED" : "REJECTED";
  if (booking.status === nextStatus)
    return {
      status: nextStatus,
      bookingId: booking.id,
      activityId: booking.settings.activityId,
      customerProfileId: booking.profileId,
      notification: notification({
        type:
          nextStatus === "ACCEPTED"
            ? "MERCHANT_RESERVATION_ACCEPTED"
            : "MERCHANT_RESERVATION_REJECTED",
        actorId: input.actorProfileId,
        recipientId: booking.profileId,
        bookingId: booking.id,
      }),
    };
  if (booking.status !== "PENDING") return { status: "STALE" };
  if (booking.date.toISOString().slice(0, 10) < getBookingToday())
    return { status: "PAST_DATE" };
  const changed = await tx.merchantBookingReservation.updateMany({
    where: { id: booking.id, status: "PENDING" },
    data: {
      status: nextStatus,
      rejectionReason: nextStatus === "REJECTED" ? reason : null,
      reviewedByProfileId: input.actorProfileId,
      reviewedAt: new Date(),
      customerSeenAt: null,
    },
  });
  if (changed.count !== 1) return { status: "STALE" };
  return {
    status: nextStatus,
    bookingId: booking.id,
    activityId: booking.settings.activityId,
    customerProfileId: booking.profileId,
    notification: notification({
      type:
        nextStatus === "ACCEPTED"
          ? "MERCHANT_RESERVATION_ACCEPTED"
          : "MERCHANT_RESERVATION_REJECTED",
      actorId: input.actorProfileId,
      recipientId: booking.profileId,
      bookingId: booking.id,
    }),
  };
}

export function cancelBooking(input: {
  actorProfileId: string;
  bookingId: string;
}) {
  return serializable((tx) => cancelBookingInDatabase(tx, input));
}

export async function cancelBookingInDatabase(
  tx: Tx,
  input: { actorProfileId: string; bookingId: string },
): Promise<Outcome> {
  const profile = await tx.userProfile.findFirst({
    where: { id: input.actorProfileId, status: "ACTIVE" },
    select: { id: true },
  });
  if (!profile) return { status: "FORBIDDEN" };
  const booking = await tx.merchantBookingReservation.findUnique({
    where: { id: input.bookingId },
    include: {
      settings: {
        select: {
          activityId: true,
          merchant: { select: { ownerProfileId: true } },
        },
      },
    },
  });
  if (!booking) return { status: "NOT_FOUND" };
  if (booking.profileId !== input.actorProfileId)
    return { status: "FORBIDDEN" };
  if (booking.status === "CANCELLED")
    return {
      status: "CANCELLED",
      bookingId: booking.id,
      activityId: booking.settings.activityId,
      ...(booking.settings.merchant.ownerProfileId
        ? {
            notification: notification({
              type: "MERCHANT_RESERVATION_CANCELLED",
              actorId: input.actorProfileId,
              recipientId: booking.settings.merchant.ownerProfileId,
              bookingId: booking.id,
            }),
          }
        : {}),
    };
  if (!["PENDING", "ACCEPTED"].includes(booking.status))
    return { status: "STALE" };
  if (booking.date.toISOString().slice(0, 10) < getBookingToday())
    return { status: "PAST_DATE" };
  const changed = await tx.merchantBookingReservation.updateMany({
    where: { id: booking.id, status: { in: ["PENDING", "ACCEPTED"] } },
    data: { status: "CANCELLED", cancelledAt: new Date() },
  });
  if (changed.count !== 1) return { status: "STALE" };
  const ownerId = booking.settings.merchant.ownerProfileId;
  return {
    status: "CANCELLED",
    bookingId: booking.id,
    activityId: booking.settings.activityId,
    ...(ownerId
      ? {
          notification: notification({
            type: "MERCHANT_RESERVATION_CANCELLED",
            actorId: input.actorProfileId,
            recipientId: ownerId,
            bookingId: booking.id,
          }),
        }
      : {}),
  };
}
