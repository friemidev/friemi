type TeamWechatShareImageInput = {
  activityId: string;
  activityUrl: string;
  locale: string;
};

export function resolveTeamWechatShareImageUrl({
  activityId,
  activityUrl,
  locale,
}: TeamWechatShareImageInput) {
  try {
    const pageUrl = new URL(activityUrl);
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
