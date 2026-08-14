export type PerformanceRolloutMode = "canary" | "legacy" | "shadow";

export type PerformanceRollout =
  | "chatCursor"
  | "guestLink"
  | "notificationBatch"
  | "werewolfRevision";

function normalizeMode(value: string | undefined): PerformanceRolloutMode {
  return value === "shadow" || value === "canary" ? value : "legacy";
}

function normalizePercentage(value: string | undefined) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.floor(parsed)));
}

function getRolloutConfiguration(rollout: PerformanceRollout) {
  switch (rollout) {
    case "guestLink":
      return {
        mode: normalizeMode(process.env.PERF_B1_GUEST_LINK_MODE),
        percentage: normalizePercentage(
          process.env.PERF_B1_GUEST_LINK_PERCENTAGE,
        ),
      };
    case "notificationBatch":
      return {
        mode: normalizeMode(process.env.PERF_B2_NOTIFICATION_BATCH_MODE),
        percentage: normalizePercentage(
          process.env.PERF_B2_NOTIFICATION_BATCH_PERCENTAGE,
        ),
      };
    case "chatCursor":
      return {
        mode: normalizeMode(process.env.NEXT_PUBLIC_PERF_B3_CHAT_CURSOR_MODE),
        percentage: normalizePercentage(
          process.env.NEXT_PUBLIC_PERF_B3_CHAT_CURSOR_PERCENTAGE,
        ),
      };
    case "werewolfRevision":
      return {
        mode: normalizeMode(process.env.PERF_B4_WEREWOLF_REVISION_MODE),
        percentage: normalizePercentage(
          process.env.PERF_B4_WEREWOLF_REVISION_PERCENTAGE,
        ),
      };
  }
}

export function isPerformanceRolloutActive(rollout: PerformanceRollout) {
  const configuration = getRolloutConfiguration(rollout);

  return (
    configuration.mode === "shadow" ||
    (configuration.mode === "canary" && configuration.percentage > 0)
  );
}

export function getStableRolloutBucket(subjectKey: string) {
  let hash = 2166136261;

  for (let index = 0; index < subjectKey.length; index += 1) {
    hash ^= subjectKey.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return (hash >>> 0) % 100;
}

export function getPerformanceRolloutMode(
  rollout: PerformanceRollout,
  subjectKey: string,
): PerformanceRolloutMode {
  const configuration = getRolloutConfiguration(rollout);

  if (configuration.mode !== "canary") {
    return configuration.mode;
  }

  return getStableRolloutBucket(subjectKey) < configuration.percentage
    ? "canary"
    : "legacy";
}

export function logPerformanceShadow(
  event: string,
  fields: Record<string, boolean | number | string | null>,
) {
  console.info(
    `[perf-shadow] ${JSON.stringify({
      event,
      ...fields,
    })}`,
  );
}
