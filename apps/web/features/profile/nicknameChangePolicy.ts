export const NICKNAME_CHANGE_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export function getNicknameChangeAvailableAt(
  nicknameChangedAt: Date | string | null | undefined,
) {
  if (!nicknameChangedAt) {
    return null;
  }

  const changedAt =
    nicknameChangedAt instanceof Date
      ? nicknameChangedAt
      : new Date(nicknameChangedAt);

  if (Number.isNaN(changedAt.getTime())) {
    return null;
  }

  return new Date(changedAt.getTime() + NICKNAME_CHANGE_COOLDOWN_MS);
}

export function canChangeNickname(
  nicknameChangedAt: Date | string | null | undefined,
  now = new Date(),
) {
  const availableAt = getNicknameChangeAvailableAt(nicknameChangedAt);

  return !availableAt || availableAt.getTime() <= now.getTime();
}
