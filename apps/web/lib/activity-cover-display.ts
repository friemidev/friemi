import { isHotlinkProtectedCoverUrl } from "@/lib/activity-cover-shared";

export function getActivityCoverDisplayUrl(imageUrl: string) {
  if (!imageUrl) {
    return "";
  }

  if (!isHotlinkProtectedCoverUrl(imageUrl)) {
    return imageUrl;
  }

  return `/api/activity-cover-proxy?url=${encodeURIComponent(imageUrl)}`;
}
