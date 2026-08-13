type PlanetMembershipState = {
  role?: string | null;
  status?: string | null;
} | null;

export function canInteractWithPlanetMoment(membership: PlanetMembershipState) {
  return membership?.status === "APPROVED";
}

export function canPublishPlanetMoment(membership: PlanetMembershipState) {
  return membership?.status === "APPROVED" && membership.role === "OWNER";
}

export function buildPlanetMomentTargetWhere(
  momentId: string,
  planetId: string,
) {
  return { id: momentId, planetId };
}

export function buildPlanetMomentCommentTargetWhere(
  commentId: string,
  planetId: string,
) {
  return {
    id: commentId,
    moment: { planetId },
  };
}
