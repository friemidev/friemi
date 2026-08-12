const REQUEST_ID_PATTERN = /^[A-Za-z0-9._:-]{1,96}$/;
const DEFAULT_SLOW_REQUEST_THRESHOLD_MS = 750;
const DEFAULT_PREVIEW_SAMPLE_RATE = 0.1;

type ApiRequestContext = {
  requestId: string;
};

function clampSampleRate(value: number) {
  return Math.min(1, Math.max(0, value));
}

function getConfiguredNumber(name: string, fallback: number) {
  const value = Number(process.env[name]);

  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function getRequestId(request: Request) {
  const providedRequestId = request.headers.get("x-request-id")?.trim();

  if (providedRequestId && REQUEST_ID_PATTERN.test(providedRequestId)) {
    return providedRequestId;
  }

  return crypto.randomUUID();
}

function appendServerTiming(headers: Headers, durationMs: number) {
  const metric = `app;dur=${durationMs.toFixed(1)}`;
  const currentValue = headers.get("server-timing");

  headers.set(
    "server-timing",
    currentValue ? `${currentValue}, ${metric}` : metric,
  );
}

function shouldSampleSuccessfulRequest() {
  const defaultRate =
    process.env.VERCEL_ENV === "preview" ? DEFAULT_PREVIEW_SAMPLE_RATE : 0;
  const sampleRate = clampSampleRate(
    getConfiguredNumber("API_PERFORMANCE_SAMPLE_RATE", defaultRate),
  );

  return Math.random() < sampleRate;
}

export async function withApiRequestMetrics(
  request: Request,
  route: string,
  handler: (context: ApiRequestContext) => Promise<Response>,
) {
  const requestId = getRequestId(request);
  const startedAt = performance.now();

  try {
    const response = await handler({ requestId });
    const durationMs = Math.max(0, performance.now() - startedAt);
    const slowRequestThresholdMs = getConfiguredNumber(
      "API_SLOW_REQUEST_THRESHOLD_MS",
      DEFAULT_SLOW_REQUEST_THRESHOLD_MS,
    );

    response.headers.set("x-request-id", requestId);
    appendServerTiming(response.headers, durationMs);

    const metric = {
      durationMs: Math.round(durationMs),
      method: request.method,
      requestId,
      route,
      status: response.status,
    };

    if (response.status >= 500) {
      console.error("[api-request] failed", metric);
    } else if (durationMs >= slowRequestThresholdMs) {
      console.warn("[api-request] slow", metric);
    } else if (shouldSampleSuccessfulRequest()) {
      console.info("[api-request] sample", metric);
    }

    return response;
  } catch (error) {
    const durationMs = Math.max(0, performance.now() - startedAt);

    console.error("[api-request] unhandled", {
      durationMs: Math.round(durationMs),
      errorName: error instanceof Error ? error.name : "UnknownError",
      method: request.method,
      requestId,
      route,
    });

    throw error;
  }
}
