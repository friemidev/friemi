import {
  formatActivityDate,
  formatActivityDateOnly,
  formatActivityTime,
  priceTypes,
  type ActivityStatus
} from "@chill-club/shared";
import type { ActivityCardViewModel, ActivityDetailViewModel } from "../types";

export function getActivityLocationLabel(activity: ActivityCardViewModel) {
  return activity.address.includes(activity.city) ? activity.address : `${activity.city} · ${activity.address}`;
}

export function getActivityDisplayStatus(activity: ActivityCardViewModel): ActivityStatus {
  if (activity.capacity > 0 && activity.participantCount >= activity.capacity) {
    return "FULL";
  }

  return activity.status;
}

export function getActivityDateLabel(activity: ActivityCardViewModel, locale: string) {
  if (!activity.endAt) {
    return formatActivityDate(activity.startAt, locale);
  }

  if (formatActivityDateOnly(activity.startAt, locale) === formatActivityDateOnly(activity.endAt, locale)) {
    return `${formatActivityDate(activity.startAt, locale)}-${formatActivityTime(activity.endAt, locale)}`;
  }

  return `${formatActivityDate(activity.startAt, locale)} - ${formatActivityDate(activity.endAt, locale)}`;
}

export function getActivitySeatLabel(activity: ActivityCardViewModel) {
  const remainingSeats = Math.max(activity.capacity - activity.participantCount, 0);

  return remainingSeats > 0 ? `剩 ${remainingSeats} 位` : "已满";
}

export function getActivityParticipantPercent(activity: ActivityCardViewModel) {
  if (activity.capacity <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((activity.participantCount / activity.capacity) * 100));
}

export function getActivityPriceLabel(activity: ActivityDetailViewModel) {
  const priceTypeLabel = priceTypes[activity.priceType];
  const priceText = activity.priceText.trim();

  if (priceText === priceTypeLabel || priceText.startsWith(`${priceTypeLabel} `)) {
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
