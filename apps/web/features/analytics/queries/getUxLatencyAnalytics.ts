import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

const defaultUxLatencyWindowDays = 30;
const slowDurationThresholdMs = 1000;

type LatencyEventKind = "operation" | "page";

type LatencyEventRow = {
  createdAt: Date;
  environment: string;
  name: string;
  properties: Prisma.JsonValue | null;
  route: string;
};

export type UxLatencyAnalytics = {
  environmentSummaries: Array<{
    averageMs: number;
    count: number;
    environment: string;
    p95Ms: number;
  }>;
  slowest: Array<{
    averageMs: number;
    count: number;
    environment: string;
    failedCount: number;
    key: string;
    kind: LatencyEventKind;
    maxMs: number;
    p95Ms: number;
    phaseLabel: string | null;
    slowCount: number;
  }>;
  summary: {
    averageMs: number;
    operationSamples: number;
    p95Ms: number;
    pageSamples: number;
    slowSamples: number;
    totalSamples: number;
  };
  windowDays: number;
};

function isJsonObject(value: Prisma.JsonValue | null): value is Prisma.JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function getNumberProperty(
  properties: Prisma.JsonValue | null,
  key: string,
) {
  if (!isJsonObject(properties)) {
    return null;
  }

  const value = properties[key];
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function getStringProperty(
  properties: Prisma.JsonValue | null,
  key: string,
) {
  if (!isJsonObject(properties)) {
    return null;
  }

  const value = properties[key];
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function getLatencyKind(name: string): LatencyEventKind | null {
  if (name === "operation_latency_recorded") {
    return "operation";
  }

  if (name === "page_load_timed") {
    return "page";
  }

  return null;
}

function getLatencyKey(event: LatencyEventRow, kind: LatencyEventKind) {
  const key =
    getStringProperty(
      event.properties,
      kind === "operation" ? "operation_key" : "route_key",
    ) ?? event.route;

  if (kind !== "operation") {
    return key;
  }

  const targetType = getStringProperty(event.properties, "target_type");

  return targetType ? `${key}:${targetType}` : key;
}

function getPhaseLabel(event: LatencyEventRow, kind: LatencyEventKind) {
  return getStringProperty(
    event.properties,
    kind === "operation" ? "status_reason" : "slowest_step_label",
  );
}

function getStatus(event: LatencyEventRow) {
  return getStringProperty(event.properties, "status");
}

function average(values: number[]) {
  if (values.length === 0) {
    return 0;
  }

  return Math.round(values.reduce((total, value) => total + value, 0) / values.length);
}

function percentile(values: number[], ratio: number) {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil(sorted.length * ratio) - 1),
  );

  return sorted[index];
}

function createEmptyUxLatencyAnalytics(
  windowDays = defaultUxLatencyWindowDays,
): UxLatencyAnalytics {
  return {
    environmentSummaries: [],
    slowest: [],
    summary: {
      averageMs: 0,
      operationSamples: 0,
      p95Ms: 0,
      pageSamples: 0,
      slowSamples: 0,
      totalSamples: 0,
    },
    windowDays,
  };
}

function summarizeEnvironment(events: Array<{ durationMs: number; environment: string }>) {
  const groups = new Map<string, number[]>();

  for (const event of events) {
    const durations = groups.get(event.environment) ?? [];
    durations.push(event.durationMs);
    groups.set(event.environment, durations);
  }

  return [...groups.entries()]
    .map(([environment, durations]) => ({
      averageMs: average(durations),
      count: durations.length,
      environment,
      p95Ms: percentile(durations, 0.95),
    }))
    .sort((left, right) => right.p95Ms - left.p95Ms);
}

export async function getUxLatencyAnalytics(
  windowDays = defaultUxLatencyWindowDays,
): Promise<UxLatencyAnalytics> {
  const since = new Date(Date.now() - windowDays * 24 * 60 * 60 * 1000);

  try {
    const events = await prisma.analyticsEvent.findMany({
      where: {
        createdAt: {
          gte: since,
        },
        name: {
          in: ["operation_latency_recorded", "page_load_timed"],
        },
      },
      select: {
        createdAt: true,
        environment: true,
        name: true,
        properties: true,
        route: true,
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 20000,
    });
    const samples: Array<{
      durationMs: number;
      environment: string;
      event: LatencyEventRow;
      key: string;
      kind: LatencyEventKind;
      phaseLabel: string | null;
      status: string | null;
    }> = [];

    for (const event of events) {
      const kind = getLatencyKind(event.name);
      const durationMs = getNumberProperty(event.properties, "duration_ms");

      if (!kind || durationMs === null || durationMs < 0) {
        continue;
      }

      samples.push({
        durationMs,
        environment: event.environment,
        event,
        key: getLatencyKey(event, kind),
        kind,
        phaseLabel: getPhaseLabel(event, kind),
        status: getStatus(event),
      });
    }

    const durations = samples.map((sample) => sample.durationMs);
    const groups = new Map<
      string,
      {
        durations: number[];
        environment: string;
        failedCount: number;
        key: string;
        kind: LatencyEventKind;
        phaseCounts: Map<string, number>;
        slowCount: number;
      }
    >();

    for (const sample of samples) {
      const groupKey = `${sample.kind}:${sample.environment}:${sample.key}`;
      const group =
        groups.get(groupKey) ??
        {
          durations: [],
          environment: sample.environment,
          failedCount: 0,
          key: sample.key,
          kind: sample.kind,
          phaseCounts: new Map<string, number>(),
          slowCount: 0,
        };

      group.durations.push(sample.durationMs);
      group.failedCount += sample.status === "failed" ? 1 : 0;
      group.slowCount += sample.durationMs >= slowDurationThresholdMs ? 1 : 0;

      if (sample.phaseLabel) {
        group.phaseCounts.set(
          sample.phaseLabel,
          (group.phaseCounts.get(sample.phaseLabel) ?? 0) + 1,
        );
      }

      groups.set(groupKey, group);
    }

    return {
      environmentSummaries: summarizeEnvironment(samples),
      slowest: [...groups.values()]
        .map((group) => {
          const maxMs = Math.max(0, ...group.durations);
          const phaseLabel =
            [...group.phaseCounts.entries()].sort(
              (left, right) => right[1] - left[1],
            )[0]?.[0] ?? null;

          return {
            averageMs: average(group.durations),
            count: group.durations.length,
            environment: group.environment,
            failedCount: group.failedCount,
            key: group.key,
            kind: group.kind,
            maxMs,
            p95Ms: percentile(group.durations, 0.95),
            phaseLabel,
            slowCount: group.slowCount,
          };
        })
        .sort(
          (left, right) =>
            right.p95Ms - left.p95Ms ||
            right.averageMs - left.averageMs ||
            right.count - left.count,
        )
        .slice(0, 12),
      summary: {
        averageMs: average(durations),
        operationSamples: samples.filter((sample) => sample.kind === "operation").length,
        p95Ms: percentile(durations, 0.95),
        pageSamples: samples.filter((sample) => sample.kind === "page").length,
        slowSamples: samples.filter(
          (sample) => sample.durationMs >= slowDurationThresholdMs,
        ).length,
        totalSamples: samples.length,
      },
      windowDays,
    };
  } catch (error) {
    console.error("Failed to load UX latency analytics", error);

    return createEmptyUxLatencyAnalytics(windowDays);
  }
}
