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

/** Keep a customer's pending party size separate from the public accepted count. */
export async function attachViewerPendingBookingPartySizes<
  T extends { id: string; isPersistent?: boolean },
>(
  activities: T[],
  viewerProfileId?: string | null,
  now = new Date(),
): Promise<(T & { viewerPendingBookingPartySize?: number })[]> {
  const activityIds = Array.from(
    new Set(
      activities.flatMap((activity) =>
        activity.isPersistent ? [activity.id] : [],
      ),
    ),
  );
  if (!viewerProfileId || !activityIds.length) return activities;

  const reservations = await prisma.merchantBookingReservation.findMany({
    where: {
      profileId: viewerProfileId,
      status: "PENDING",
      date: { gte: parseBookingDate(getBookingToday(now))! },
      settings: { activityId: { in: activityIds } },
    },
    select: {
      partySize: true,
      settings: { select: { activityId: true } },
    },
  });
  const peopleByActivityId = new Map<string, number>();
  for (const reservation of reservations) {
    const activityId = reservation.settings.activityId;
    peopleByActivityId.set(
      activityId,
      (peopleByActivityId.get(activityId) ?? 0) + reservation.partySize,
    );
  }

  return activities.map((activity) =>
    activity.isPersistent
      ? {
          ...activity,
          viewerPendingBookingPartySize:
            peopleByActivityId.get(activity.id) ?? 0,
        }
      : activity,
  );
}
