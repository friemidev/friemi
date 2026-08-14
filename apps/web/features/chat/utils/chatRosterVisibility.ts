export function isChatRosterEntryHidden(
  hiddenAt: Date | null | undefined,
  lastMessageAt: Date | null | undefined,
) {
  if (!hiddenAt) {
    return false;
  }

  return !lastMessageAt || lastMessageAt.getTime() <= hiddenAt.getTime();
}
