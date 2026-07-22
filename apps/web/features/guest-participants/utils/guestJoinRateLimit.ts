export const guestJoinRateLimitWindowMs = 60 * 60 * 1000;
export const maxGuestJoinsPerActivityPerFingerprint = 99;
export const maxGuestJoinsGlobalPerFingerprint = 99;

export function isGuestJoinRateLimited({
  activityAttemptCount,
  globalAttemptCount,
}: {
  activityAttemptCount: number;
  globalAttemptCount: number;
}) {
  return (
    activityAttemptCount >= maxGuestJoinsPerActivityPerFingerprint ||
    globalAttemptCount >= maxGuestJoinsGlobalPerFingerprint
  );
}
