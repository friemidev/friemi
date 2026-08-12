import type {
  AnalyticsEnvironment,
  AnalyticsEventInput,
  AnalyticsEventName,
} from "./events";

const sampleableEventNames = new Set<AnalyticsEventName>([
  "activity_list_viewed",
  "activity_swipe_viewed",
  "operation_latency_recorded",
  "page_load_timed",
]);
const performanceEventNames = new Set<AnalyticsEventName>([
  "operation_latency_recorded",
  "page_load_timed",
]);

const DEFAULT_PREVIEW_SAMPLE_RATE = 0.1;
const DEFAULT_QUEUE_DEPTH = 250;
const DEFAULT_QUEUE_PRIORITY_RESERVE = 100;

function clampSampleRate(value: number) {
  return Math.min(1, Math.max(0, value));
}

function getConfiguredNumber(
  value: string | undefined,
  fallback: number,
) {
  const parsed = Number(value);

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function isSampleableAnalyticsEvent(name: AnalyticsEventName) {
  return sampleableEventNames.has(name);
}

export function getAnalyticsSampleRate(
  name: AnalyticsEventName,
  environment: AnalyticsEnvironment,
  configuredRate?: string,
) {
  if (!isSampleableAnalyticsEvent(name)) {
    return 1;
  }

  const fallback =
    environment === "preview" && performanceEventNames.has(name)
      ? DEFAULT_PREVIEW_SAMPLE_RATE
      : 1;
  const runtimeRate = performanceEventNames.has(name)
    ? process.env.ANALYTICS_SAMPLE_RATE
    : undefined;

  return clampSampleRate(
    getConfiguredNumber(configuredRate ?? runtimeRate, fallback),
  );
}

export function sampleAnalyticsEvent(
  input: AnalyticsEventInput,
  environment: AnalyticsEnvironment,
  randomValue = Math.random(),
) {
  const sampleRate = getAnalyticsSampleRate(input.name, environment);

  if (randomValue >= sampleRate) {
    return null;
  }

  if (sampleRate === 1) {
    return input;
  }

  return {
    ...input,
    properties: {
      ...input.properties,
      analytics_sample_rate: sampleRate,
    },
  };
}

export function getAnalyticsQueueLimits() {
  const maxDepth = Math.max(
    1,
    Math.floor(
      getConfiguredNumber(
        process.env.ANALYTICS_QUEUE_MAX_DEPTH,
        DEFAULT_QUEUE_DEPTH,
      ),
    ),
  );
  const priorityReserve = Math.max(
    0,
    Math.floor(
      getConfiguredNumber(
        process.env.ANALYTICS_QUEUE_PRIORITY_RESERVE,
        DEFAULT_QUEUE_PRIORITY_RESERVE,
      ),
    ),
  );

  return {
    maxDepth,
    hardMaxDepth: maxDepth + priorityReserve,
  };
}
