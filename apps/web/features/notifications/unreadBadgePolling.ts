const DEFAULT_MAX_POLL_INTERVAL_MS = 5 * 60 * 1000;
const DEFAULT_MAX_JITTER_MS = 5000;
export const DEFAULT_UNREAD_BADGE_FRESHNESS_WINDOW_MS = 30_000;

const ENABLED_VALUES = new Set(["1", "true", "on"]);
const DISABLED_VALUES = new Set(["0", "false", "off"]);

function clampRandomValue(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(0.999999, Math.max(0, value));
}

export function resolveUnreadBadgeFreshnessGuardEnabled({
  configuredValue,
  vercelEnvironment,
}: {
  configuredValue?: string;
  vercelEnvironment?: string;
}) {
  const normalizedValue = configuredValue?.trim().toLowerCase();

  if (normalizedValue && ENABLED_VALUES.has(normalizedValue)) {
    return true;
  }

  if (normalizedValue && DISABLED_VALUES.has(normalizedValue)) {
    return false;
  }

  return vercelEnvironment === "preview";
}

export function getUnreadBadgeFreshnessRemainingMs({
  freshnessGuardEnabled,
  freshnessWindowMs = DEFAULT_UNREAD_BADGE_FRESHNESS_WINDOW_MS,
  lastSuccessfulRefreshAtMs,
  nowMs = Date.now(),
}: {
  freshnessGuardEnabled: boolean;
  freshnessWindowMs?: number;
  lastSuccessfulRefreshAtMs: number | null;
  nowMs?: number;
}) {
  if (
    !freshnessGuardEnabled ||
    lastSuccessfulRefreshAtMs === null ||
    !Number.isFinite(lastSuccessfulRefreshAtMs) ||
    !Number.isFinite(nowMs)
  ) {
    return 0;
  }

  const safeFreshnessWindowMs = Math.max(0, Math.floor(freshnessWindowMs));
  const elapsedMs = Math.max(0, Math.floor(nowMs - lastSuccessfulRefreshAtMs));

  return Math.max(0, safeFreshnessWindowMs - elapsedMs);
}

export function getUnreadBadgePollDelayMs({
  baseIntervalMs,
  consecutiveFailures,
  maxIntervalMs = DEFAULT_MAX_POLL_INTERVAL_MS,
  maxJitterMs = DEFAULT_MAX_JITTER_MS,
  randomValue = Math.random(),
}: {
  baseIntervalMs: number;
  consecutiveFailures: number;
  maxIntervalMs?: number;
  maxJitterMs?: number;
  randomValue?: number;
}) {
  const safeBaseIntervalMs = Math.max(1000, Math.floor(baseIntervalMs));
  const safeMaxIntervalMs = Math.max(
    safeBaseIntervalMs,
    Math.floor(maxIntervalMs),
  );
  const safeFailureCount = Math.max(0, Math.floor(consecutiveFailures));
  const backoffExponent = Math.max(0, safeFailureCount - 1);
  const backoffIntervalMs = Math.min(
    safeMaxIntervalMs,
    safeBaseIntervalMs * 2 ** Math.min(backoffExponent, 12),
  );
  const jitterMs = Math.floor(
    Math.max(0, maxJitterMs) * clampRandomValue(randomValue),
  );

  return Math.min(safeMaxIntervalMs, backoffIntervalMs + jitterMs);
}
