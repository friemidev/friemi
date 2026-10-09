export const PENDING_NAVIGATION_RECOVERY_DELAY_MS = 8_000;

type RecoveryState = {
  currentHref: string;
  destinationHref: string;
  elapsedMs: number;
  isOnline: boolean;
  isVisible: boolean;
  startingHref: string;
};

export function getPendingNavigationRecoveryHref({
  currentHref,
  destinationHref,
  elapsedMs,
  isOnline,
  isVisible,
  startingHref,
}: RecoveryState): string | null {
  if (
    !isVisible ||
    !isOnline ||
    elapsedMs < PENDING_NAVIGATION_RECOVERY_DELAY_MS
  ) {
    return null;
  }

  try {
    const start = new URL(startingHref);
    const current = new URL(currentHref);
    const destination = new URL(destinationHref, start);

    if (
      current.href !== start.href ||
      destination.origin !== start.origin ||
      destination.href === start.href
    ) {
      return null;
    }

    return destination.href;
  } catch {
    return null;
  }
}
