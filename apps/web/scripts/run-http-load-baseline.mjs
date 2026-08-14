import { writeFile } from "node:fs/promises";

const productionHosts = new Set([
  "friemi.com",
  "www.friemi.com",
  "friemi.vercel.app",
]);
const localHosts = new Set(["127.0.0.1", "localhost", "::1"]);
const defaultRoutes = [
  "/zh-CN/mobile-home",
  "/api/lobby/swipe?limit=8",
];

function readArgument(name, fallback) {
  const prefix = `--${name}=`;
  const argument = process.argv.find((value) => value.startsWith(prefix));

  return argument ? argument.slice(prefix.length) : fallback;
}

function readPositiveNumber(name, fallback) {
  const value = Number(readArgument(name, String(fallback)));

  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`--${name} must be a positive number.`);
  }

  return value;
}

function readLevels() {
  const levels = readArgument("levels", "20,50,100")
    .split(",")
    .map((value) => Number(value.trim()));

  if (
    levels.length === 0 ||
    levels.some((value) => !Number.isInteger(value) || value <= 0)
  ) {
    throw new Error("--levels must contain positive integers.");
  }

  return levels;
}

function readRoutes() {
  const value = readArgument("routes", "");

  if (!value) {
    return defaultRoutes;
  }

  const routes = value
    .split(",")
    .map((route) => route.trim())
    .filter(Boolean);

  if (routes.length === 0 || routes.some((route) => !route.startsWith("/"))) {
    throw new Error("--routes must contain comma-separated absolute paths.");
  }

  return routes;
}

function assertSafeTarget(baseUrl) {
  const url = new URL(baseUrl);

  if (productionHosts.has(url.hostname)) {
    throw new Error(`Refusing to load test production host ${url.hostname}.`);
  }

  if (
    !localHosts.has(url.hostname) &&
    process.env.PERF_ALLOW_REMOTE_TARGET !== "preview-only"
  ) {
    throw new Error(
      "Remote targets require PERF_ALLOW_REMOTE_TARGET=preview-only.",
    );
  }
}

function percentile(sortedValues, percentileValue) {
  if (sortedValues.length === 0) {
    return 0;
  }

  const index = Math.min(
    sortedValues.length - 1,
    Math.ceil((percentileValue / 100) * sortedValues.length) - 1,
  );

  return sortedValues[Math.max(0, index)];
}

function round(value, digits = 1) {
  const factor = 10 ** digits;

  return Math.round(value * factor) / factor;
}

function wait(delayMs) {
  return new Promise((resolve) => setTimeout(resolve, delayMs));
}

function summarizeResults(results, durationMs) {
  const durations = results
    .map((result) => result.durationMs)
    .sort((left, right) => left - right);
  const statusCounts = {};
  const errorCounts = {};

  for (const result of results) {
    statusCounts[result.status] = (statusCounts[result.status] ?? 0) + 1;

    if (result.error) {
      errorCounts[result.error] = (errorCounts[result.error] ?? 0) + 1;
    }
  }

  const failed = results.filter((result) => !result.ok).length;
  const totalBytes = results.reduce((total, result) => total + result.bytes, 0);

  return {
    requests: results.length,
    requestsPerSecond: round(results.length / (durationMs / 1000), 2),
    failed,
    errorRate: round(results.length > 0 ? failed / results.length : 0, 4),
    latencyMs: {
      p50: round(percentile(durations, 50)),
      p75: round(percentile(durations, 75)),
      p95: round(percentile(durations, 95)),
      p99: round(percentile(durations, 99)),
      max: round(durations.at(-1) ?? 0),
    },
    responseMegabytes: round(totalBytes / 1024 / 1024, 2),
    statusCounts,
    errorCounts,
  };
}

async function requestRoute({ baseUrl, path, timeoutMs }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = performance.now();

  try {
    const response = await fetch(new URL(path, baseUrl), {
      cache: "no-store",
      headers: {
        "User-Agent":
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/140 Safari/537.36",
      },
      redirect: "follow",
      signal: controller.signal,
    });
    const body = await response.arrayBuffer();

    return {
      bytes: body.byteLength,
      durationMs: performance.now() - startedAt,
      ok: response.ok,
      path,
      status: response.status,
    };
  } catch (error) {
    return {
      bytes: 0,
      durationMs: performance.now() - startedAt,
      error:
        error instanceof Error
          ? `${error.name}: ${error.message}`
          : "UnknownError",
      ok: false,
      path,
      status: 0,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function summarizeStage({ concurrency, durationMs, results }) {
  const routeCounts = {};

  for (const result of results) {
    routeCounts[result.path] = (routeCounts[result.path] ?? 0) + 1;
  }

  const routes = Object.fromEntries(
    Object.keys(routeCounts).map((path) => [
      path,
      summarizeResults(
        results.filter((result) => result.path === path),
        durationMs,
      ),
    ]),
  );

  return {
    concurrency,
    durationSeconds: round(durationMs / 1000, 2),
    ...summarizeResults(results, durationMs),
    routeCounts,
    routes,
  };
}

async function runStage({
  baseUrl,
  concurrency,
  durationMs,
  routes,
  thinkMaxMs,
  thinkMinMs,
  timeoutMs,
}) {
  const results = [];
  const startedAt = performance.now();
  const deadline = startedAt + durationMs;

  async function runVirtualUser(workerIndex) {
    let requestIndex = workerIndex;

    while (performance.now() < deadline) {
      const path = routes[requestIndex % routes.length];
      results.push(await requestRoute({ baseUrl, path, timeoutMs }));
      requestIndex += 1;

      if (performance.now() >= deadline) {
        break;
      }

      const thinkDelay =
        thinkMinMs + Math.random() * Math.max(0, thinkMaxMs - thinkMinMs);
      await wait(thinkDelay);
    }
  }

  await Promise.all(
    Array.from({ length: concurrency }, (_, index) => runVirtualUser(index)),
  );

  return summarizeStage({
    concurrency,
    durationMs: performance.now() - startedAt,
    results,
  });
}

async function main() {
  const baseUrl = readArgument("base-url", "http://127.0.0.1:3000");
  const durationMs = readPositiveNumber("duration-seconds", 60) * 1000;
  const levels = readLevels();
  const outputPath = readArgument("output", "");
  const routes = readRoutes();
  const thinkMinMs = readPositiveNumber("think-min-ms", 400);
  const thinkMaxMs = readPositiveNumber("think-max-ms", 1200);
  const timeoutMs = readPositiveNumber("timeout-ms", 15000);

  if (thinkMaxMs < thinkMinMs) {
    throw new Error("--think-max-ms must be greater than --think-min-ms.");
  }

  assertSafeTarget(baseUrl);

  for (const path of routes) {
    const warmup = await requestRoute({ baseUrl, path, timeoutMs });

    if (!warmup.ok) {
      throw new Error(
        `Warmup failed for ${path}: status=${warmup.status} error=${warmup.error ?? "none"}`,
      );
    }
  }

  const report = {
    generatedAt: new Date().toISOString(),
    target: new URL(baseUrl).origin,
    routes,
    settings: {
      durationSeconds: durationMs / 1000,
      levels,
      thinkMaxMs,
      thinkMinMs,
      timeoutMs,
    },
    stages: [],
  };

  for (const concurrency of levels) {
    const stage = await runStage({
      baseUrl,
      concurrency,
      durationMs,
      routes,
      thinkMaxMs,
      thinkMinMs,
      timeoutMs,
    });

    report.stages.push(stage);
    process.stdout.write(`${JSON.stringify(stage)}\n`);
    await wait(3000);
  }

  if (outputPath) {
    await writeFile(outputPath, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  }

  process.stdout.write(`${JSON.stringify({ report }, null, 2)}\n`);
}

main().catch((error) => {
  process.stderr.write(
    `${error instanceof Error ? error.stack ?? error.message : String(error)}\n`,
  );
  process.exitCode = 1;
});
