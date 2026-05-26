import { formatActivityDate, formatActivityDateOnly, formatActivityTime, type ActivityStatus } from "@chill-club/shared";
import type { ActivityCardViewModel } from "../types";

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
