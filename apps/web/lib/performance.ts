type PerformanceStep = {
  durationMs: number;
  label: string;
};

type PerformanceTrackerOptions = {
  locale?: string;
  metadata?: Record<string, string | number | boolean | null | undefined>;
  route: string;
};

function nowMs() {
  return performance.now();
}

function roundMs(value: number) {
  return Math.round(value);
}

function isPerformanceDebugEnabled() {
  return (
    process.env.PERFORMANCE_DEBUG === "1" ||
    process.env.NEXT_PUBLIC_PERFORMANCE_DEBUG === "1" ||
    process.env.NODE_ENV === "development"
  );
}

function getRuntimeEnvironment() {
  return process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown";
}

function formatMetadata(
  metadata: Record<string, string | number | boolean | null | undefined>,
) {
  return Object.entries(metadata)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => `${key}=${String(value)}`)
    .join(" ");
}

export function createPerformanceTracker({
  locale,
  metadata = {},
  route,
}: PerformanceTrackerOptions) {
  const startedAt = nowMs();
  const steps: PerformanceStep[] = [];

  async function measure<T>(label: string, task: () => Promise<T>): Promise<T> {
    const stepStartedAt = nowMs();

    try {
      return await task();
    } finally {
      steps.push({
        durationMs: roundMs(nowMs() - stepStartedAt),
        label,
      });
    }
  }

  function mark(label: string, durationMs: number) {
    steps.push({
      durationMs: roundMs(durationMs),
      label,
    });
  }

  function finish(
    extraMetadata: Record<
      string,
      string | number | boolean | null | undefined
    > = {},
  ) {
    const totalMs = roundMs(nowMs() - startedAt);

    if (!isPerformanceDebugEnabled()) {
      return {
        steps,
        totalMs,
      };
    }

    const stepSummary = steps
      .map((step) => `${step.label}:${step.durationMs}ms`)
      .join(" ");
    const metadataSummary = formatMetadata({
      env: getRuntimeEnvironment(),
      locale,
      ...metadata,
      ...extraMetadata,
    });

    console.info(
      `[perf] route=${route} total=${totalMs}ms ${metadataSummary} ${stepSummary}`.trim(),
    );

    return {
      steps,
      totalMs,
    };
  }

  return {
    finish,
    mark,
    measure,
  };
}
