const DEFAULT_MAX_POLL_INTERVAL_MS = 5 * 60 * 1000;
const DEFAULT_MAX_JITTER_MS = 5000;

function clampRandomValue(value: number) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(0.999999, Math.max(0, value));
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
