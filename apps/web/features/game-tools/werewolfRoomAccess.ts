export function canLeaveWerewolfOccupancy({
  hasPrivateToken,
  memberProfileId,
  seatProfileId,
  viewerProfileId,
}: {
  hasPrivateToken: boolean;
  memberProfileId: string | null;
  seatProfileId: string | null;
  viewerProfileId: string | null;
}) {
  if (hasPrivateToken) {
    return true;
  }

  const protectedProfileIds = [memberProfileId, seatProfileId].filter(
    (profileId): profileId is string => Boolean(profileId),
  );

  return protectedProfileIds.every(
    (profileId) => profileId === viewerProfileId,
  );
}
