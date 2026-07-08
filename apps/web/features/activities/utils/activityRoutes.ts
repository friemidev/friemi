import { withLocale } from "@/lib/routes";

export function getActivityDetailPath(activityId: string) {
  return `/lobby/${activityId}`;
}

export function getLegacyActivityDetailPath(activityId: string) {
  return `/activities/${activityId}`;
}

export function getLocalizedActivityDetailPath(
  locale: string,
  activityId: string,
) {
  return withLocale(locale, getActivityDetailPath(activityId));
}
