"use client";

const activityListBackLoopGuardKey = "friemi:activity-list-back-loop-guard";
const activityListBackLoopGuardTtlMs = 2 * 60 * 1000;

type ActivityListBackLoopGuard = {
  expiresAt: number;
  sourceHref: string;
  version: 1;
};

function canUseSessionStorage() {
  return typeof window !== "undefined" && Boolean(window.sessionStorage);
}

export function writeActivityListBackLoopGuard(sourceHref: string) {
  if (!canUseSessionStorage()) {
    return;
  }

  const guard: ActivityListBackLoopGuard = {
    expiresAt: Date.now() + activityListBackLoopGuardTtlMs,
    sourceHref,
    version: 1,
  };

  try {
    window.sessionStorage.setItem(
      activityListBackLoopGuardKey,
      JSON.stringify(guard),
    );
  } catch {
    // Ignore unavailable storage in embedded or private contexts.
  }
}

export function consumeActivityListBackLoopGuard() {
  if (!canUseSessionStorage()) {
    return false;
  }

  try {
    const raw = window.sessionStorage.getItem(activityListBackLoopGuardKey);

    if (!raw) {
      return false;
    }

    window.sessionStorage.removeItem(activityListBackLoopGuardKey);

    const guard = JSON.parse(raw) as ActivityListBackLoopGuard;

    return Boolean(
      guard &&
        guard.version === 1 &&
        guard.expiresAt >= Date.now() &&
        /\/activities(?:[/?#]|$)/.test(guard.sourceHref),
    );
  } catch {
    window.sessionStorage.removeItem(activityListBackLoopGuardKey);
    return false;
  }
}
