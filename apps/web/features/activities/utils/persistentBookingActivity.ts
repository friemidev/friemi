import type { Prisma } from "@prisma/client";

export const MERCHANT_BOOKING_ACTIVITY_SOURCE = "MERCHANT_BOOKING";

export function isPersistentBookingActivity(activity: {
  isPersistent?: boolean;
  source?: string | null;
}) {
  return (
    activity.isPersistent === true ||
    activity.source === MERCHANT_BOOKING_ACTIVITY_SOURCE
  );
}

export function getPersistentBookingActivityWhere(): Prisma.ActivityWhereInput {
  return {
    isPersistent: true,
    source: MERCHANT_BOOKING_ACTIVITY_SOURCE,
    status: "RECRUITING",
    visibility: "PUBLIC",
    organizer: { status: "ACTIVE" },
    merchant: {
      is: {
        isActive: true,
        owner: { is: { status: "ACTIVE" } },
      },
    },
    merchantBookingSettings: { is: { enabled: true } },
  };
}

export function getPersistentBookingCopy(locale: string) {
  return locale === "fr"
    ? {
        kind: "Sortie permanente",
        open: "Réservations ouvertes",
        action: "Réserver",
        manage: "Gérer les réservations",
        bookingRequired:
          "Choisissez une date et le nombre de personnes sur la page de réservation.",
        ownBookings:
          "Gérez ou annulez votre réservation depuis Mes réservations.",
        settings:
          "Gérez cette sortie depuis les réglages de réservation de la boutique.",
      }
    : locale === "en"
      ? {
          kind: "Ongoing meetup",
          open: "Open for bookings",
          action: "Book a visit",
          manage: "Manage bookings",
          bookingRequired: "Choose a date and party size on the booking page.",
          ownBookings: "Manage or cancel your booking in My bookings.",
          settings: "Manage this meetup in the store's booking settings.",
        }
      : {
          kind: "长期聚吧",
          open: "开放预约",
          action: "立即预约",
          manage: "管理预约",
          bookingRequired: "请在预约页选择日期和人数，提交预约。",
          ownBookings: "请在我的预约中查看或取消预约。",
          settings: "请在门店预约设置中管理这个长期聚吧。",
        };
}

type DiscoveryIndex = {
  id: string;
  isPersistent?: boolean;
  createdAt?: Date | string;
  lastBookingAt?: Date | string | null;
};

export function getPersistentBookingSortTime(activity: DiscoveryIndex) {
  return new Date(activity.lastBookingAt ?? activity.createdAt ?? 0).getTime();
}

/** Merge the full filtered index before pagination; preserve ordinary item order. */
export function mergePersistentBookingActivities<T extends DiscoveryIndex>(
  items: T[],
): T[] {
  const ordinary = items.filter((item) => !item.isPersistent);
  const persistent = items
    .filter((item) => item.isPersistent)
    .sort(
      (left, right) =>
        getPersistentBookingSortTime(right) -
          getPersistentBookingSortTime(left) || left.id.localeCompare(right.id),
    );
  const merged: T[] = [];
  let ordinaryIndex = 0;
  let persistentIndex = 0;
  while (
    ordinaryIndex < ordinary.length ||
    persistentIndex < persistent.length
  ) {
    const nextOrdinary = ordinary[ordinaryIndex];
    const nextPersistent = persistent[persistentIndex];
    if (
      nextPersistent &&
      (!nextOrdinary ||
        getPersistentBookingSortTime(nextPersistent) >=
          new Date(nextOrdinary.createdAt ?? 0).getTime())
    ) {
      merged.push(nextPersistent);
      persistentIndex += 1;
    } else {
      merged.push(nextOrdinary);
      ordinaryIndex += 1;
    }
  }
  return merged;
}
