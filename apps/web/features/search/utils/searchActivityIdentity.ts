import type { ActivityCardViewModel } from "@/features/activities/types";
import { isPublicEventCard } from "@/features/activities/utils/activityCardKind";

function normalizeIdentityText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function normalizeIdentityDate(value: Date | string | null | undefined) {
  if (!value) {
    return "";
  }

  const timestamp = new Date(value).getTime();

  return Number.isFinite(timestamp) ? String(timestamp) : String(value);
}

function isReusablePublicEventCover(value: string | null | undefined) {
  if (!value) {
    return false;
  }

  return !(
    value.startsWith("/illustrations/") ||
    value.startsWith("/images/") ||
    value.includes("default")
  );
}

export function getSearchActivityRenderKey(activity: ActivityCardViewModel) {
  return isPublicEventCard(activity)
    ? `event-${activity.publicEventId ?? activity.id}`
    : `crew-${activity.id}`;
}

function getPublicEventContentKey(activity: ActivityCardViewModel) {
  return [
    "event-content",
    normalizeIdentityText(activity.title),
    normalizeIdentityText(activity.city),
    normalizeIdentityText(activity.address),
    normalizeIdentityDate(activity.startAt),
    normalizeIdentityDate(activity.endAt),
  ].join(":");
}

function getPublicEventSeriesKey(activity: ActivityCardViewModel) {
  if (!isReusablePublicEventCover(activity.coverImageUrl)) {
    return null;
  }

  return [
    "event-series",
    activity.coverImageUrl?.trim().toLocaleLowerCase(),
    normalizeIdentityText(activity.city),
    normalizeIdentityDate(activity.startAt),
    normalizeIdentityDate(activity.endAt),
  ].join(":");
}

function getSearchActivityDedupeKeys(activity: ActivityCardViewModel) {
  if (!isPublicEventCard(activity)) {
    return [`crew:${activity.id}`];
  }

  return [
    `event:${activity.publicEventId ?? activity.id}`,
    getPublicEventContentKey(activity),
    getPublicEventSeriesKey(activity),
  ].filter((key): key is string => Boolean(key));
}

export function filterUniqueSearchActivities(
  current: ActivityCardViewModel[],
  nextItems: ActivityCardViewModel[],
) {
  const seenKeys = new Set(current.flatMap(getSearchActivityDedupeKeys));

  return nextItems.filter((activity) => {
    const keys = getSearchActivityDedupeKeys(activity);

    if (keys.some((key) => seenKeys.has(key))) {
      return false;
    }

    keys.forEach((key) => seenKeys.add(key));
    return true;
  });
}

export function dedupeSearchActivities(activities: ActivityCardViewModel[]) {
  return filterUniqueSearchActivities([], activities);
}
