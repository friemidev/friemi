const reservationTypes = new Set([
  "MERCHANT_RESERVATION_REQUESTED",
  "MERCHANT_RESERVATION_ACCEPTED",
  "MERCHANT_RESERVATION_REJECTED",
  "MERCHANT_RESERVATION_CANCELLED",
]);

export function isMerchantReservationNotice(type: string) {
  return reservationTypes.has(type);
}

export function getMerchantReservationNoticePath(input: {
  bookingId?: string | null;
  forCustomer?: boolean;
  type: string;
}) {
  if (!isMerchantReservationNotice(input.type)) return null;
  if (!input.bookingId) return "/notifications";
  const ownerNotice =
    input.type === "MERCHANT_RESERVATION_REQUESTED" ||
    (input.type === "MERCHANT_RESERVATION_CANCELLED" &&
      input.forCustomer === false);
  return ownerNotice
    ? `/profile/store/bookings/reservations/${input.bookingId}`
    : `/profile/bookings/${input.bookingId}`;
}

/** Notification copy deliberately excludes private contact fields and notes. */
export function getMerchantReservationNoticeCopy(input: {
  type: string;
  locale: string;
  merchantName?: string | null;
  date?: string | null;
  partySize?: number | null;
}) {
  if (!isMerchantReservationNotice(input.type)) return null;
  const locale =
    input.locale === "fr" ? "fr" : input.locale === "en" ? "en" : "zh-CN";
  const names = { "zh-CN": "门店", en: "Store", fr: "Boutique" };
  const merchant = input.merchantName || names[locale];
  const people = input.partySize ?? 1;
  const detail = [
    merchant,
    input.date,
    locale === "zh-CN"
      ? `${people} 人`
      : locale === "fr"
        ? `${people} personne${people === 1 ? "" : "s"}`
        : `${people} guest${people === 1 ? "" : "s"}`,
  ]
    .filter(Boolean)
    .join(" · ");
  const titles: Record<typeof locale, Record<string, string>> = {
    "zh-CN": {
      MERCHANT_RESERVATION_REQUESTED: "收到新预约",
      MERCHANT_RESERVATION_ACCEPTED: "门店已接受预约",
      MERCHANT_RESERVATION_REJECTED: "门店未接受预约",
      MERCHANT_RESERVATION_CANCELLED: "预约已取消",
    },
    en: {
      MERCHANT_RESERVATION_REQUESTED: "New reservation",
      MERCHANT_RESERVATION_ACCEPTED: "Reservation accepted",
      MERCHANT_RESERVATION_REJECTED: "Reservation declined",
      MERCHANT_RESERVATION_CANCELLED: "Reservation cancelled",
    },
    fr: {
      MERCHANT_RESERVATION_REQUESTED: "Nouvelle réservation",
      MERCHANT_RESERVATION_ACCEPTED: "Réservation acceptée",
      MERCHANT_RESERVATION_REJECTED: "Réservation refusée",
      MERCHANT_RESERVATION_CANCELLED: "Réservation annulée",
    },
  };
  return { title: titles[locale][input.type]!, body: detail };
}
