import type { ActivityCardViewModel } from "../types";

type PrivateActivityCardAccessInput = {
  friendIds: string[];
  viewerParticipationStatus:
    | "JOINED"
    | "APPROVED"
    | "PENDING"
    | "REJECTED"
    | "CANCELLED"
    | null;
  viewerProfileId: string | null;
};

export function canAccessPrivateActivityCard(
  activity: Pick<ActivityCardViewModel, "organizerId" | "visibility">,
  input: PrivateActivityCardAccessInput,
) {
  return (
    activity.visibility !== "PRIVATE" ||
    activity.organizerId === input.viewerProfileId ||
    input.friendIds.includes(activity.organizerId ?? "") ||
    input.viewerParticipationStatus === "JOINED" ||
    input.viewerParticipationStatus === "APPROVED" ||
    input.viewerParticipationStatus === "PENDING"
  );
}

export function applyPrivateActivityCardAccess(
  activity: ActivityCardViewModel,
  viewerCanAccess: boolean,
): ActivityCardViewModel {
  if (activity.visibility !== "PRIVATE" || viewerCanAccess) {
    return { ...activity, viewerCanAccess: true };
  }

  return {
    ...activity,
    address: activity.city,
    contactableParticipants: [],
    description: "",
    friendSignal: null,
    latitude: null,
    longitude: null,
    participantPreview: [],
    viewerCanAccess: false,
  };
}

export function isPrivateActivityCardLocked(
  activity: Pick<ActivityCardViewModel, "viewerCanAccess" | "visibility">,
) {
  return (
    activity.visibility === "PRIVATE" && activity.viewerCanAccess === false
  );
}
