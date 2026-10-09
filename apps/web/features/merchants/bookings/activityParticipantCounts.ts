import { prisma } from "@/lib/prisma";
import { getBookingToday, parseBookingDate } from "./validation";

type BookingActivity = {
  isPersistent?: boolean;
  merchantBookingSettings?: { id: string } | null;
};

/** Public discovery shows people in confirmed, upcoming reservations, not accounts. */
export async function attachPersistentBookingParticipantCounts<
  T extends BookingActivity,
>(
  activities: T[],
  now = new Date(),
): Promise<(T & { bookingParticipantCount?: number })[]> {
  const settingsIds = Array.from(
    new Set(
      activities.flatMap((activity) =>
        activity.isPersistent && activity.merchantBookingSettings
          ? [activity.merchantBookingSettings.id]
          : [],
      ),
    ),
  );
  if (!settingsIds.length) return activities;

  const counts = await prisma.merchantBookingReservation.groupBy({
    by: ["settingsId"],
    where: {
      settingsId: { in: settingsIds },
      status: "ACCEPTED",
      date: { gte: parseBookingDate(getBookingToday(now))! },
    },
    _sum: { partySize: true },
  });
  const peopleBySettingsId = new Map(
    counts.map((count) => [count.settingsId, count._sum.partySize ?? 0]),
  );

  return activities.map((activity) =>
    activity.isPersistent
      ? {
          ...activity,
          bookingParticipantCount: activity.merchantBookingSettings
            ? (peopleBySettingsId.get(activity.merchantBookingSettings.id) ?? 0)
            : 0,
        }
      : activity,
  );
}
