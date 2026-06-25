import {
  formatActivityDate,
  formatActivityDateOnly,
  formatActivityTime,
  formatFloatingActivityDate,
  formatFloatingActivityDateOnly,
  formatFloatingActivityTime,
  type ActivityStatus,
} from "@chill-club/shared";
import { getCopy, getPriceTypeLabel } from "@/lib/copy";
import type { ActivityCardViewModel, ActivityDetailViewModel } from "../types";

export type ActivityDisplayTimeState = "UPCOMING" | "ONGOING" | "ENDED";

const activityReferenceTimeZone = "Europe/Paris";

function getDatePart(parts: Intl.DateTimeFormatPart[], type: string) {
  return parts.find((part) => part.type === type)?.value ?? "";
}

export function getActivityFloatingNow(reference = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: activityReferenceTimeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(reference);

  return new Date(
    Date.UTC(
      Number(getDatePart(parts, "year")),
      Number(getDatePart(parts, "month")) - 1,
      Number(getDatePart(parts, "day")),
      Number(getDatePart(parts, "hour")),
      Number(getDatePart(parts, "minute")),
      Number(getDatePart(parts, "second")),
    ),
  );
}

function usesFloatingActivityTime(activity: ActivityCardViewModel) {
  return activity.type !== "PUBLIC_EVENT";
}

export function getActivityLocationLabel(activity: ActivityCardViewModel) {
  return activity.address.includes(activity.city)
    ? activity.address
    : `${activity.city} · ${activity.address}`;
}

export function getActivityTimeState(
  activity: ActivityCardViewModel,
  now = getActivityFloatingNow(),
): ActivityDisplayTimeState {
  const comparisonNow = usesFloatingActivityTime(activity) ? now : new Date();

  if (activity.status === "ENDED" || activity.status === "CANCELLED") {
    return "ENDED";
  }

  const startAt = new Date(activity.startAt);

  if (startAt > comparisonNow) {
    return "UPCOMING";
  }

  if (activity.endAt && new Date(activity.endAt) > comparisonNow) {
    return "ONGOING";
  }

  return "ENDED";
}

export function getActivityDisplayStatus(
  activity: ActivityCardViewModel,
): ActivityStatus {
  if (activity.status === "CANCELLED") {
    return "CANCELLED";
  }

  if (activity.status === "ENDED") {
    return "ENDED";
  }

  const activityEndBoundary = new Date(activity.endAt ?? activity.startAt);

  const comparisonNow = usesFloatingActivityTime(activity)
    ? getActivityFloatingNow()
    : new Date();

  if (activityEndBoundary <= comparisonNow) {
    return "ENDED";
  }

  const canBecomeFull = ["OPEN", "RECRUITING", "CONFIRMED"].includes(
    activity.status,
  );

  if (
    canBecomeFull &&
    activity.capacity > 0 &&
    activity.participantCount >= activity.capacity
  ) {
    return "FULL";
  }

  if (canBecomeFull) {
    return "OPEN";
  }

  return activity.status;
}

export function getActivityDateLabel(
  activity: ActivityCardViewModel,
  locale: string,
) {
  const formatDate = usesFloatingActivityTime(activity)
    ? formatFloatingActivityDate
    : formatActivityDate;
  const formatDateOnly = usesFloatingActivityTime(activity)
    ? formatFloatingActivityDateOnly
    : formatActivityDateOnly;
  const formatTime = usesFloatingActivityTime(activity)
    ? formatFloatingActivityTime
    : formatActivityTime;

  if (!activity.endAt) {
    return formatDate(activity.startAt, locale);
  }

  if (
    formatDateOnly(activity.startAt, locale) ===
    formatDateOnly(activity.endAt, locale)
  ) {
    return `${formatDate(activity.startAt, locale)}-${formatTime(activity.endAt, locale)}`;
  }

  return `${formatDate(activity.startAt, locale)} - ${formatDate(activity.endAt, locale)}`;
}

export function getActivitySeatLabel(
  activity: ActivityCardViewModel,
  locale = "zh-CN",
) {
  const labels = getCopy(locale).activityLabels.seats;
  const displayStatus = getActivityDisplayStatus(activity);

  if (displayStatus === "CANCELLED") {
    return labels.cancelled;
  }

  if (displayStatus === "ENDED") {
    return labels.ended;
  }

  if (displayStatus === "DRAFT") {
    return labels.draft;
  }

  if (displayStatus === "FULL") {
    return labels.full;
  }

  if (activity.capacity <= 0) {
    return labels.unlimited;
  }

  const remainingSeats = Math.max(
    activity.capacity - activity.participantCount,
    0,
  );

  return labels.remaining(remainingSeats);
}

export function getActivityParticipantPercent(activity: ActivityCardViewModel) {
  if (activity.capacity <= 0) {
    return 0;
  }

  return Math.min(
    100,
    Math.round((activity.participantCount / activity.capacity) * 100),
  );
}

export function getActivityPriceLabel(
  activity: ActivityDetailViewModel,
  locale = "zh-CN",
) {
  const priceTypeLabel = getPriceTypeLabel(activity.priceType, locale);
  const priceText = activity.priceText.trim();

  if (priceText.length === 0) {
    return priceTypeLabel;
  }

  if (activity.priceType === "FREE" && priceText === "0") {
    return priceTypeLabel;
  }

  if (
    priceText === priceTypeLabel ||
    priceText.startsWith(`${priceTypeLabel} `)
  ) {
    return priceText;
  }

  return `${priceTypeLabel} · ${priceText}`;
}

export function getActivityItineraryItems(activity: ActivityDetailViewModel) {
  return activity.itinerary
    ? activity.itinerary
        .split(/\r?\n/)
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

export function getActivityOrganizerInitial(activity: ActivityDetailViewModel) {
  return activity.organizer.nickname.trim().slice(0, 1) || "N";
}
