import type { ActivityCardViewModel } from "../types";

type ActivityCardIdentity = Pick<
  ActivityCardViewModel,
  "address" | "category" | "city" | "coverImageUrl" | "id" | "title" | "type"
> &
  Partial<Pick<ActivityCardViewModel, "isActivityInfo" | "publicEventId">> & {
    endAt: Date | string | null;
    startAt: Date | string;
  };

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

function getPublicEventContentKey(activity: ActivityCardIdentity) {
  return [
    "event-content",
    normalizeIdentityText(activity.title),
    normalizeIdentityText(activity.city),
    normalizeIdentityText(activity.address),
    normalizeIdentityDate(activity.startAt),
    normalizeIdentityDate(activity.endAt),
  ].join(":");
}

function getPublicEventCoverSeriesKey(activity: ActivityCardIdentity) {
  if (!isReusablePublicEventCover(activity.coverImageUrl)) {
    return null;
  }

  return [
    "event-cover-series",
    activity.coverImageUrl?.trim().toLocaleLowerCase(),
    normalizeIdentityText(activity.city),
    normalizeIdentityDate(activity.startAt),
    normalizeIdentityDate(activity.endAt),
  ].join(":");
}

function getPublicEventTitleSeriesKey(activity: ActivityCardIdentity) {
  const seriesTitle = activity.title
    .normalize("NFKC")
    .match(/^(.+?)\s*[:：]\s*.+$/u)?.[1];
  const normalizedSeriesTitle = normalizeIdentityText(seriesTitle);
  const compactLength = Array.from(
    normalizedSeriesTitle.replace(/\s+/g, ""),
  ).length;

  if (compactLength < 12) {
    return null;
  }

  return [
    "event-title-series",
    normalizedSeriesTitle,
    activity.category,
    normalizeIdentityText(activity.city),
    normalizeIdentityDate(activity.startAt),
    normalizeIdentityDate(activity.endAt),
  ].join(":");
}

export function getActivityCardDedupeKeys(activity: ActivityCardIdentity) {
  if (activity.type !== "PUBLIC_EVENT" && !activity.isActivityInfo) {
    return [`activity:${activity.id}`];
  }

  return [
    `event:${activity.publicEventId ?? activity.id}`,
    getPublicEventContentKey(activity),
    getPublicEventCoverSeriesKey(activity),
    getPublicEventTitleSeriesKey(activity),
  ].filter((key): key is string => Boolean(key));
}

export function filterUniqueActivityCards<T extends ActivityCardIdentity>(
  current: readonly ActivityCardIdentity[],
  nextItems: readonly T[],
) {
  const seenKeys = new Set(current.flatMap(getActivityCardDedupeKeys));

  return nextItems.filter((activity) => {
    const keys = getActivityCardDedupeKeys(activity);

    if (keys.some((key) => seenKeys.has(key))) {
      return false;
    }

    keys.forEach((key) => seenKeys.add(key));
    return true;
  });
}

export function dedupeActivityCards<T extends ActivityCardIdentity>(
  activities: readonly T[],
) {
  return filterUniqueActivityCards([], activities);
}
