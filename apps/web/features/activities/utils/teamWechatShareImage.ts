import { getActivityCoverDisplayUrl } from "@/lib/activity-cover-display";
import { isActivityCategoryIllustrationSrc } from "./activityCategoryVisuals";

type TeamWechatShareImageInput = {
  activityId: string;
  activityUrl: string;
  coverImageUrl?: string | null;
  locale: string;
};

function resolveSafeCustomCoverUrl(
  coverImageUrl: string | null | undefined,
  baseUrl: URL,
) {
  if (!coverImageUrl || isActivityCategoryIllustrationSrc(coverImageUrl)) {
    return null;
  }

  try {
    const imageUrl = new URL(
      getActivityCoverDisplayUrl(coverImageUrl),
      baseUrl.origin,
    );

    if (
      imageUrl.protocol !== "https:" &&
      imageUrl.hostname !== "localhost" &&
      imageUrl.hostname !== "127.0.0.1"
    ) {
      return null;
    }

    return imageUrl.toString();
  } catch {
    return null;
  }
}

export function resolveTeamWechatShareImageUrl({
  activityId,
  activityUrl,
  coverImageUrl,
  locale,
}: TeamWechatShareImageInput) {
  try {
    const pageUrl = new URL(activityUrl);
    const customCoverUrl = resolveSafeCustomCoverUrl(coverImageUrl, pageUrl);

    if (customCoverUrl) {
      return customCoverUrl;
    }

    const shareImageUrl = new URL("/api/share/team-card", pageUrl.origin);
    shareImageUrl.searchParams.set("activityId", activityId);
    shareImageUrl.searchParams.set("locale", locale);
    shareImageUrl.searchParams.set("variant", "wechat");

    const accessToken = pageUrl.searchParams.get("access");

    if (accessToken) {
      shareImageUrl.searchParams.set("access", accessToken);
    }

    return shareImageUrl.toString();
  } catch {
    return null;
  }
}
