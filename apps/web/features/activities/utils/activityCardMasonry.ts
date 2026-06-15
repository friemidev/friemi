import type { ActivityCardViewModel } from "../types";

type ActivityCardMasonryWeightOptions = {
  showPrimaryAction?: boolean;
};

export function getActivityCardMasonryWeight(
  activity: ActivityCardViewModel,
  options: ActivityCardMasonryWeightOptions = {},
) {
  const isActivityInfo = Boolean(
    activity.type === "PUBLIC_EVENT" || activity.isActivityInfo,
  );
  const participantCount = activity.participantCount ?? 0;
  const participantPreviewCount = activity.participantPreview?.length ?? 0;
  const titleWeight = Math.min(2, Math.floor(activity.title.length / 28));

  return (
    10 +
    titleWeight +
    (isActivityInfo ? 0 : 2) +
    (options.showPrimaryAction ? 3 : 0) +
    (participantCount > 0 ? 1 : 0) +
    (participantPreviewCount > 0 ? 1 : 0)
  );
}
