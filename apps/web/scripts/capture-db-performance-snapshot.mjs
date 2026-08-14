import { writeFile } from "node:fs/promises";
import { resolve } from "node:path";

import { PrismaClient } from "@prisma/client";
import { config as loadEnvironment } from "dotenv";

function readArgument(name, fallback) {
  const prefix = `--${name}=`;
  const argument = process.argv.find((value) => value.startsWith(prefix));

  return argument ? argument.slice(prefix.length) : fallback;
}

function toSerializable(value) {
  if (typeof value === "bigint") {
    return value.toString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(toSerializable);
  }

  if (value && typeof value === "object") {
    if (typeof value.toJSON === "function") {
      return value.toJSON();
    }

    return Object.fromEntries(
      Object.entries(value).map(([key, child]) => [key, toSerializable(child)]),
    );
  }

  return value;
}

loadEnvironment({ path: resolve(process.cwd(), "apps/web/.env") });

const outputPath = readArgument("output", "");
const includeStatementCounters =
  readArgument("include-statement-counters", "false") === "true";
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required.");
}

const parsedDatabaseUrl = new URL(databaseUrl);
const prisma = new PrismaClient();

try {
  const [
    server,
    settings,
    databaseStats,
    connections,
    waits,
    statements,
    top,
    statementCounters,
  ] = await Promise.all([
      prisma.$queryRaw`
        SELECT
          current_database() AS database_name,
          current_setting('server_version') AS server_version,
          pg_postmaster_start_time() AS server_started_at,
          pg_database_size(current_database())::bigint AS database_size_bytes
      `,
      prisma.$queryRaw`
        SELECT name, setting, unit
        FROM pg_settings
        WHERE name IN (
          'max_connections',
          'shared_buffers',
          'effective_cache_size',
          'work_mem',
          'maintenance_work_mem'
        )
        ORDER BY name
      `,
      prisma.$queryRaw`
        SELECT
          numbackends::bigint,
          xact_commit::bigint,
          xact_rollback::bigint,
          blks_read::bigint,
          blks_hit::bigint,
          temp_files::bigint,
          temp_bytes::bigint,
          deadlocks::bigint,
          stats_reset
        FROM pg_stat_database
        WHERE datname = current_database()
      `,
      prisma.$queryRaw`
        SELECT COALESCE(state, 'unknown') AS state, COUNT(*)::bigint AS count
        FROM pg_stat_activity
        WHERE datname = current_database()
        GROUP BY COALESCE(state, 'unknown')
        ORDER BY state
      `,
      prisma.$queryRaw`
        SELECT
          COALESCE(wait_event_type, 'none') AS wait_event_type,
          COALESCE(wait_event, 'none') AS wait_event,
          COUNT(*)::bigint AS count
        FROM pg_stat_activity
        WHERE datname = current_database()
        GROUP BY wait_event_type, wait_event
        ORDER BY count DESC, wait_event_type, wait_event
      `,
      prisma.$queryRaw`
        SELECT
          COUNT(*)::bigint AS tracked_statements,
          COALESCE(SUM(calls), 0)::bigint AS calls,
          ROUND(COALESCE(SUM(total_exec_time), 0)::numeric, 3)::text AS total_exec_time_ms,
          COALESCE(SUM(rows), 0)::bigint AS rows,
          COALESCE(SUM(shared_blks_hit), 0)::bigint AS shared_blks_hit,
          COALESCE(SUM(shared_blks_read), 0)::bigint AS shared_blks_read,
          COALESCE(SUM(temp_blks_read), 0)::bigint AS temp_blks_read,
          COALESCE(SUM(temp_blks_written), 0)::bigint AS temp_blks_written
        FROM extensions.pg_stat_statements
        WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
      `,
      prisma.$queryRaw`
        SELECT
          queryid::text,
          SUM(calls)::bigint AS calls,
          ROUND(SUM(total_exec_time)::numeric, 3)::text AS total_exec_time_ms,
          ROUND((SUM(total_exec_time) / NULLIF(SUM(calls), 0))::numeric, 3)::text AS mean_exec_time_ms,
          ROUND(MAX(max_exec_time)::numeric, 3)::text AS max_exec_time_ms,
          SUM(rows)::bigint AS rows,
          SUM(shared_blks_hit)::bigint AS shared_blks_hit,
          SUM(shared_blks_read)::bigint AS shared_blks_read,
          SUM(temp_blks_read)::bigint AS temp_blks_read,
          SUM(temp_blks_written)::bigint AS temp_blks_written
        FROM extensions.pg_stat_statements
        WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
        GROUP BY queryid
        ORDER BY SUM(total_exec_time) DESC
        LIMIT 20
      `,
      includeStatementCounters
        ? prisma.$queryRaw`
            SELECT
              queryid::text,
              SUM(calls)::bigint AS calls,
              ROUND(SUM(total_exec_time)::numeric, 3)::text AS total_exec_time_ms,
              SUM(rows)::bigint AS rows,
              SUM(shared_blks_hit)::bigint AS shared_blks_hit,
              SUM(shared_blks_read)::bigint AS shared_blks_read,
              SUM(temp_blks_read)::bigint AS temp_blks_read,
              SUM(temp_blks_written)::bigint AS temp_blks_written
            FROM extensions.pg_stat_statements
            WHERE dbid = (SELECT oid FROM pg_database WHERE datname = current_database())
            GROUP BY queryid
          `
        : Promise.resolve([]),
    ]);

  const snapshot = toSerializable({
    capturedAt: new Date().toISOString(),
    endpoint: {
      hostname: parsedDatabaseUrl.hostname,
      port: parsedDatabaseUrl.port,
      database: parsedDatabaseUrl.pathname.replace(/^\//, ""),
      pgbouncer: parsedDatabaseUrl.searchParams.get("pgbouncer"),
      connectionLimit: parsedDatabaseUrl.searchParams.get("connection_limit"),
    },
    server: server[0],
    settings,
    databaseStats: databaseStats[0],
    connections,
    waits,
    statementTotals: statements[0],
    topStatements: top,
    statementCountersIncluded: includeStatementCounters,
    ...(includeStatementCounters ? { statementCounters } : {}),
  });
  const serialized = `${JSON.stringify(snapshot, null, 2)}\n`;

  if (outputPath) {
    await writeFile(outputPath, serialized, "utf8");
  }

  process.stdout.write(serialized);
} finally {
  await prisma.$disconnect();
}
