import { NextResponse, type NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { getAnalyticsEnvironment } from "@/features/analytics/events";
import {
  importParisOpenDataActivities,
  parisOpenDataSource,
  PublicActivityImportError,
  type PublicActivityImportSummary,
} from "@/features/public-activities/importParisOpenDataActivities";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type CronAuthResult =
  | {
      ok: true;
    }
  | {
      code: "MISSING_CRON_SECRET" | "INVALID_CRON_SECRET";
      ok: false;
      status: 401;
    };

const importRunEventName = "public_activity_import_run";
const cronRoute = "/api/cron/import-public-activities";

function getRequestId(request: NextRequest) {
  return (
    request.headers.get("x-vercel-id") ??
    request.headers.get("x-request-id") ??
    crypto.randomUUID()
  );
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}

function getErrorDetails(error: unknown) {
  if (error instanceof PublicActivityImportError) {
    return {
      code: error.code,
      message: error.message,
      stage: error.stage,
      status: error.status ?? null,
    };
  }

  return {
    code: "UNEXPECTED_IMPORT_ERROR",
    message: getErrorMessage(error),
    stage: "unexpected",
    status: null,
  };
}

function logImportEvent(
  level: "error" | "info" | "warn",
  event: string,
  payload: Record<string, unknown>,
) {
  const line = {
    event,
    route: cronRoute,
    source: parisOpenDataSource,
    timestamp: new Date().toISOString(),
    ...payload,
  };

  if (level === "error") {
    console.error(JSON.stringify(line));
    return;
  }

  if (level === "warn") {
    console.warn(JSON.stringify(line));
    return;
  }

  console.info(JSON.stringify(line));
}

function isAuthorized(request: NextRequest): CronAuthResult {
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret && process.env.NODE_ENV !== "production") {
    return { ok: true };
  }

  if (!cronSecret) {
    return {
      code: "MISSING_CRON_SECRET",
      ok: false,
      status: 401,
    };
  }

  const authorized =
    request.headers.get("authorization") === `Bearer ${cronSecret}` ||
    request.headers.get("x-cron-secret") === cronSecret;

  return authorized
    ? { ok: true }
    : {
        code: "INVALID_CRON_SECRET",
        ok: false,
        status: 401,
      };
}

function getSafeEnvironmentStatus() {
  return {
    cronSecret: Boolean(process.env.CRON_SECRET),
    databaseUrl: Boolean(process.env.DATABASE_URL),
    directUrl: Boolean(process.env.DIRECT_URL),
    parisOpenDataApiKey: process.env.PARIS_OPEN_DATA_API_KEY
      ? "configured"
      : "not_required",
  };
}

function toImportRunProperties(
  status: "failure" | "success",
  payload: {
    dryRun: boolean;
    error?: ReturnType<typeof getErrorDetails>;
    requestId: string;
    summary?: PublicActivityImportSummary;
  },
): Prisma.InputJsonValue {
  return {
    dry_run: payload.dryRun,
    error_code: payload.error?.code ?? null,
    error_message: payload.error?.message ?? null,
    error_stage: payload.error?.stage ?? null,
    external_status: payload.error?.status ?? null,
    request_id: payload.requestId,
    source: parisOpenDataSource,
    status,
    summary: payload.summary
      ? {
          completed_at: payload.summary.completedAt,
          created: payload.summary.created,
          duration_ms: payload.summary.durationMs,
          empty_result: payload.summary.emptyResult,
          fetched: payload.summary.fetched,
          limit: payload.summary.limit,
          pools: payload.summary.pools.map((pool) => ({
            fetched: pool.fetched,
            key: pool.key,
            label: pool.label,
            limit: pool.limit,
          })),
          skipped: payload.summary.skipped,
          skipped_invalid_records: payload.summary.skippedInvalidRecords,
          started_at: payload.summary.startedAt,
          time_windows: payload.summary.timeWindows.map((window) => ({
            end_at: window.endAt,
            fetched: window.fetched,
            key: window.key,
            label: window.label,
            limit: window.limit,
            pool_key: window.poolKey,
            pool_label: window.poolLabel,
            start_at: window.startAt,
          })),
          updated: payload.summary.updated,
        }
      : null,
  } satisfies Prisma.InputJsonValue;
}

async function recordImportRun(
  status: "failure" | "success",
  payload: {
    dryRun: boolean;
    error?: ReturnType<typeof getErrorDetails>;
    requestId: string;
    summary?: PublicActivityImportSummary;
  },
) {
  try {
    await prisma.analyticsEvent.create({
      data: {
        name: importRunEventName,
        environment: getAnalyticsEnvironment(),
        locale: "zh-CN",
        route: cronRoute,
        sourceSurface: "cron",
        entityType: "public_event",
        entityId: parisOpenDataSource,
        properties: toImportRunProperties(status, payload),
      },
    });
  } catch (error) {
    logImportEvent("warn", "public_activity_import.telemetry_failed", {
      error: getErrorMessage(error),
      requestId: payload.requestId,
      status,
    });
  }
}

function readJsonRecord(value: Prisma.JsonValue | null) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, Prisma.JsonValue>)
    : {};
}

function getStringProperty(
  properties: Record<string, Prisma.JsonValue>,
  key: string,
) {
  const value = properties[key];

  return typeof value === "string" ? value : null;
}

async function getImportHealth(requestId: string) {
  const [recentRuns, latestSyncedPublicEvent, totalImportedPublicEvents] =
    await Promise.all([
      prisma.analyticsEvent.findMany({
        where: {
          name: importRunEventName,
          entityId: parisOpenDataSource,
        },
        orderBy: {
          createdAt: "desc",
        },
        select: {
          createdAt: true,
          properties: true,
        },
        take: 50,
      }),
      prisma.publicEvent.findFirst({
        where: {
          externalSource: parisOpenDataSource,
        },
        orderBy: {
          lastSyncedAt: "desc",
        },
        select: {
          lastSyncedAt: true,
        },
      }),
      prisma.publicEvent.count({
        where: {
          externalSource: parisOpenDataSource,
        },
      }),
    ]);

  const normalizedRuns = recentRuns.map((run) => {
    const properties = readJsonRecord(run.properties);

    return {
      createdAt: run.createdAt.toISOString(),
      errorCode: getStringProperty(properties, "error_code"),
      errorStage: getStringProperty(properties, "error_stage"),
      requestId: getStringProperty(properties, "request_id"),
      status: getStringProperty(properties, "status"),
      summary: properties.summary ?? null,
    };
  });
  const lastSuccess = normalizedRuns.find((run) => run.status === "success");
  const lastFailure = normalizedRuns.find((run) => run.status === "failure");

  return {
    environment: getSafeEnvironmentStatus(),
    latestSyncedPublicEventAt:
      latestSyncedPublicEvent?.lastSyncedAt?.toISOString() ?? null,
    lastFailure,
    lastRun: normalizedRuns[0] ?? null,
    lastSuccess,
    requestId,
    source: parisOpenDataSource,
    totalImportedPublicEvents,
  };
}

async function handleImport(request: NextRequest) {
  const requestId = getRequestId(request);
  const authResult = isAuthorized(request);

  if (!authResult.ok) {
    logImportEvent("warn", "public_activity_import.unauthorized", {
      code: authResult.code,
      requestId,
    });

    return NextResponse.json(
      {
        code: authResult.code,
        ok: false,
        requestId,
      },
      {
        status: authResult.status,
      },
    );
  }

  if (request.nextUrl.searchParams.get("health") === "true") {
    const health = await getImportHealth(requestId);

    return NextResponse.json({
      ok: true,
      health,
    });
  }

  const limitValue = request.nextUrl.searchParams.get("limit");
  const limit = limitValue ? Number(limitValue) : undefined;
  const dryRun = request.nextUrl.searchParams.get("dryRun") === "true";

  logImportEvent("info", "public_activity_import.started", {
    dryRun,
    limit: limit ?? null,
    requestId,
  });

  try {
    const summary = await importParisOpenDataActivities({ dryRun, limit });

    await recordImportRun("success", {
      dryRun,
      requestId,
      summary,
    });
    logImportEvent("info", "public_activity_import.completed", {
      requestId,
      summary,
    });

    return NextResponse.json({
      ok: true,
      requestId,
      summary,
    });
  } catch (error) {
    const errorDetails = getErrorDetails(error);

    await recordImportRun("failure", {
      dryRun,
      error: errorDetails,
      requestId,
    });
    logImportEvent("error", "public_activity_import.failed", {
      dryRun,
      error: errorDetails,
      limit: limit ?? null,
      requestId,
    });

    return NextResponse.json(
      {
        code: errorDetails.code,
        error: errorDetails.message,
        failureStage: errorDetails.stage,
        ok: false,
        requestId,
      },
      {
        status: 502,
      },
    );
  }
}

export async function GET(request: NextRequest) {
  return handleImport(request);
}

export async function POST(request: NextRequest) {
  return handleImport(request);
}
