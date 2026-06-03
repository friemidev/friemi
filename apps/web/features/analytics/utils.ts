import type {
  AnalyticsEntityType,
  AnalyticsSourceSurface,
} from "@/features/analytics/events";
import type { ActivityCardViewModel, ActivityDetailViewModel } from "@/features/activities/types";

export function inferAnalyticsSourceSurfaceFromReferrer(
  referrer: string | null | undefined,
  fallback: AnalyticsSourceSurface,
): AnalyticsSourceSurface {
  const normalizedReferrer = referrer?.trim();

  if (!normalizedReferrer) {
    return fallback;
  }

  try {
    const pathname = new URL(normalizedReferrer).pathname;

    if (pathname.includes("/search")) return "global_search";
    if (pathname.includes("/public-events/")) return "public_event_detail";
    if (pathname.includes("/activities/")) return "activity_detail";
    if (pathname.endsWith("/activities")) return "activity_list";
    if (pathname.includes("/profile")) return "profile";
    if (pathname.includes("/messages")) return "messages";
    if (pathname.includes("/notifications")) return "notification";
  } catch {
    return fallback;
  }

  return fallback;
}

export function getAnalyticsEntityForActivity(
  activity: Pick<ActivityCardViewModel, "id" | "isActivityInfo" | "publicEventId" | "type">,
): {
  entityId: string;
  entityType: AnalyticsEntityType;
  itemKind: "public_event" | "team";
} {
  const isActivityInfo = Boolean(
    activity.type === "PUBLIC_EVENT" || activity.isActivityInfo,
  );

  if (isActivityInfo) {
    return {
      entityId: activity.publicEventId ?? activity.id,
      entityType: "public_event",
      itemKind: "public_event",
    };
  }

  return {
    entityId: activity.id,
    entityType: "team",
    itemKind: "team",
  };
}

export function getAnalyticsEntityForActivityDetail(
  activity: Pick<ActivityDetailViewModel, "id" | "isActivityInfo" | "publicEvent" | "publicEventId" | "type">,
) {
  return getAnalyticsEntityForActivity({
    id: activity.id,
    isActivityInfo: activity.isActivityInfo,
    publicEventId: activity.publicEvent?.id ?? activity.publicEventId,
    type: activity.type,
  });
}
