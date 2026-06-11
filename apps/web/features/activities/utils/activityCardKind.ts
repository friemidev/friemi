import type { ActivityCardViewModel } from "../types";

export function isPublicEventCard(activity: ActivityCardViewModel) {
  return activity.type === "PUBLIC_EVENT" || Boolean(activity.isActivityInfo);
}
