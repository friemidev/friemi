import type { ActivityCardViewModel } from "@/features/activities/types";
import { isPublicEventCard } from "@/features/activities/utils/activityCardKind";
import {
  dedupeActivityCards,
  filterUniqueActivityCards,
} from "@/features/activities/utils/activityCardIdentity";

export function getSearchActivityRenderKey(activity: ActivityCardViewModel) {
  return isPublicEventCard(activity)
    ? `event-${activity.publicEventId ?? activity.id}`
    : `crew-${activity.id}`;
}

export function filterUniqueSearchActivities(
  current: ActivityCardViewModel[],
  nextItems: ActivityCardViewModel[],
) {
  return filterUniqueActivityCards(current, nextItems);
}

export function dedupeSearchActivities(activities: ActivityCardViewModel[]) {
  return dedupeActivityCards(activities);
}
