import { readFile, writeFile } from "node:fs/promises";

function readArgument(name, fallback) {
  const prefix = `--${name}=`;
  const argument = process.argv.find((value) => value.startsWith(prefix));

  return argument ? argument.slice(prefix.length) : fallback;
}

function median(values) {
  const sorted = values.toSorted((left, right) => left - right);
  const midpoint = Math.floor(sorted.length / 2);

  if (sorted.length % 2 === 1) {
    return sorted[midpoint];
  }

  return (sorted[midpoint - 1] + sorted[midpoint]) / 2;
}

function medianMetrics(metrics) {
  const numericKeys = [
    "durationSeconds",
    "requests",
    "requestsPerSecond",
    "failed",
    "errorRate",
    "responseMegabytes",
  ];
  const result = Object.fromEntries(
    numericKeys
      .filter((key) => metrics.every((value) => typeof value[key] === "number"))
      .map((key) => [key, median(metrics.map((value) => value[key]))]),
  );

  result.latencyMs = Object.fromEntries(
    ["p50", "p75", "p95", "p99", "max"].map((key) => [
      key,
      median(metrics.map((value) => value.latencyMs[key])),
    ]),
  );

  return result;
}

const outputPath = readArgument("output", "");
const inputPaths = process.argv.slice(2).filter((value) => !value.startsWith("--"));

if (!outputPath || inputPaths.length < 3) {
  throw new Error(
    "Usage: node summarize-http-load-runs.mjs --output=<path> <run-1.json> <run-2.json> <run-3.json>",
  );
}

const reports = await Promise.all(
  inputPaths.map(async (path) => JSON.parse(await readFile(path, "utf8"))),
);
const reference = reports[0];
const levels = reference.settings.levels;

for (const report of reports.slice(1)) {
  if (
    report.target !== reference.target ||
    JSON.stringify(report.routes) !== JSON.stringify(reference.routes) ||
    JSON.stringify(report.settings) !== JSON.stringify(reference.settings)
  ) {
    throw new Error("Input reports do not share the same target and settings.");
  }
}

const medianStages = levels.map((concurrency) => {
  const stages = reports.map((report) =>
    report.stages.find((stage) => stage.concurrency === concurrency),
  );

  if (stages.some((stage) => !stage)) {
    throw new Error(`Missing ${concurrency} CCU stage in one or more reports.`);
  }

  return {
    concurrency,
    ...medianMetrics(stages),
    routes: Object.fromEntries(
      reference.routes.map((route) => [
        route,
        medianMetrics(stages.map((stage) => stage.routes[route])),
      ]),
    ),
  };
});
const summary = {
  generatedAt: new Date().toISOString(),
  target: reference.target,
  routes: reference.routes,
  settings: reference.settings,
  sourceFiles: inputPaths,
  calculation: "Median of all runs for each metric; no best-run selection.",
  totalRequests: reports.reduce(
    (total, report) =>
      total + report.stages.reduce((runTotal, stage) => runTotal + stage.requests, 0),
    0,
  ),
  totalFailed: reports.reduce(
    (total, report) =>
      total + report.stages.reduce((runTotal, stage) => runTotal + stage.failed, 0),
    0,
  ),
  medianStages,
};

await writeFile(outputPath, `${JSON.stringify(summary, null, 2)}\n`, "utf8");
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
