import type { ActivityCardViewModel } from "../types";
import { getActivityTimeState } from "./activityDisplay";

type LobbyActivityPriorityOptions = {
  reference?: Date;
  tieBreaker?: (
    left: ActivityCardViewModel,
    right: ActivityCardViewModel,
  ) => number;
  viewerProfileId?: string | null;
};

export function compareLobbyActivityStatusAndOwnership(
  left: ActivityCardViewModel,
  right: ActivityCardViewModel,
  {
    reference = new Date(),
    viewerProfileId = null,
  }: LobbyActivityPriorityOptions = {},
) {
  const leftEnded = getActivityTimeState(left, reference) === "ENDED";
  const rightEnded = getActivityTimeState(right, reference) === "ENDED";

  if (leftEnded !== rightEnded) {
    return leftEnded ? 1 : -1;
  }

  if (viewerProfileId) {
    const leftOwned = left.organizerId === viewerProfileId;
    const rightOwned = right.organizerId === viewerProfileId;

    if (leftOwned !== rightOwned) {
      return leftOwned ? -1 : 1;
    }
  }

  return 0;
}

function compareLobbyActivityTime(
  left: ActivityCardViewModel,
  right: ActivityCardViewModel,
  reference: Date,
) {
  const leftEnded = getActivityTimeState(left, reference) === "ENDED";
  const leftTime = new Date(left.startAt).getTime();
  const rightTime = new Date(right.startAt).getTime();
  const timeDifference = leftEnded
    ? rightTime - leftTime
    : leftTime - rightTime;

  return timeDifference || left.id.localeCompare(right.id);
}

export function sortLobbyActivitiesByStatusAndOwnership(
  activities: ActivityCardViewModel[],
  options: LobbyActivityPriorityOptions = {},
) {
  const reference = options.reference ?? new Date();

  return [...activities].sort(
    (left, right) =>
      compareLobbyActivityStatusAndOwnership(left, right, {
        reference,
        viewerProfileId: options.viewerProfileId,
      }) ||
      options.tieBreaker?.(left, right) ||
      compareLobbyActivityTime(left, right, reference),
  );
}
