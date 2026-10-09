import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

type BadgeDatabase = Pick<
  Prisma.TransactionClient,
  "merchantBookingReservation" | "merchantResidencySignup"
>;

export type BookingEntryState = {
  hasBookingHistory: boolean;
  unreadBookingCount: number;
};

export function getUnreadBookingCount(profileId: string) {
  return getUnreadBookingCountInDatabase(prisma, profileId);
}

export function getUnreadBookingCountInDatabase(
  db: Pick<BadgeDatabase, "merchantBookingReservation">,
  profileId: string,
): Promise<number> {
  return db.merchantBookingReservation.count({
    where: { profileId, customerSeenAt: null },
  });
}

export function getBookingEntryState(profileId: string) {
  return getBookingEntryStateInDatabase(prisma, profileId);
}

export async function getBookingEntryStateInDatabase(
  db: BadgeDatabase,
  profileId: string,
): Promise<BookingEntryState> {
  const [unreadBookingCount, booking, legacySignup] = await Promise.all([
    getUnreadBookingCountInDatabase(db, profileId),
    db.merchantBookingReservation.findFirst({
      where: { profileId },
      select: { id: true },
    }),
    db.merchantResidencySignup.findFirst({
      where: { profileId },
      select: { id: true },
    }),
  ]);
  return {
    // Cancelled, rejected and past reservations still belong to the customer's history.
    hasBookingHistory: Boolean(unreadBookingCount || booking || legacySignup),
    unreadBookingCount,
  };
}

export async function markCustomerBookingsSeenInDatabase(
  db: Pick<Prisma.TransactionClient, "$executeRaw">,
  input: { profileId: string; openedAt: Date; now: Date },
): Promise<number> {
  if (
    !Number.isFinite(input.openedAt.getTime()) ||
    !Number.isFinite(input.now.getTime())
  ) {
    throw new Error("Invalid booking view timestamp");
  }
  const openedAt = new Date(
    Math.min(input.openedAt.getTime(), input.now.getTime()),
  );
  // Bypass Prisma's @updatedAt: viewing a reservation is not a business update.
  // A review or new booking after this page opened must retain its unread state.
  return db.$executeRaw`
    UPDATE "MerchantBookingReservation"
    SET "customerSeenAt" = ${input.now}
    WHERE "profileId" = ${input.profileId}
      AND "customerSeenAt" IS NULL
      AND "updatedAt" <= ${openedAt}
  `;
}
