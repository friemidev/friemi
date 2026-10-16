const endpoint = process.env.DDZ_DEADLINE_ENDPOINT;
const secret = process.env.CRON_SECRET;
const connection = process.env.DIRECT_URL;
const previewRef = "dryhbxognbrljslzciuh";
const previewHost =
  "friemi-git-codex-doudizhu-sichuan-mahjong-friemi.vercel.app";
if (
  !endpoint ||
  !secret ||
  !connection ||
  process.env.DDZ_PREVIEW_DB_REF !== previewRef ||
  process.env.DDZ_PREVIEW_HOST !== previewHost
)
  throw new Error(
    "Supply the selected Dou Dizhu Preview endpoint, database, host, and scheduler secret.",
  );
const url = new URL(endpoint),
  database = new URL(connection);
const previewDatabase =
  database.hostname === `db.${previewRef}.supabase.co` ||
  (database.hostname.endsWith(".pooler.supabase.com") &&
    decodeURIComponent(database.username) === `postgres.${previewRef}` &&
    database.port === "5432");
if (
  !previewDatabase ||
  database.protocol !== "postgresql:" ||
  url.protocol !== "https:" ||
  url.hostname !== previewHost ||
  url.pathname !== "/api/cron/doudizhu-deadlines" ||
  url.search ||
  url.hash
)
  throw new Error(
    "The endpoint or database is not the selected Preview resource.",
  );

const response = await fetch(url, {
  headers: { authorization: `Bearer ${secret}` },
  signal: AbortSignal.timeout(20_000),
});
if (!response.ok)
  throw new Error(
    `Preview deadline endpoint rejected the request (${response.status}).`,
  );
const preflight = await response.json();
if (preflight.errors || typeof preflight.scanned !== "number")
  throw new Error("Preview deadline preflight did not succeed.");

process.env.DATABASE_URL = connection;
const { PrismaClient } = await import("@prisma/client");
const db = new PrismaClient();
const endpointName = "doudizhu_preview_deadline_endpoint",
  secretName = "doudizhu_preview_cron_secret";
const requestSql = `SELECT net.http_get(
  url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = '${endpointName}'),
  headers := jsonb_build_object('Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = '${secretName}')),
  timeout_milliseconds := 15000
)`;
const dueSql = `${requestSql} WHERE EXISTS (
  SELECT 1 FROM public."GameToolRoom" WHERE kind::text = 'DOUDIZHU'
    AND status::text IN ('LOBBY', 'IN_PROGRESS', 'FINISHED')
    AND "ddzDeadlineAt" <= (now() AT TIME ZONE 'UTC')
)`;
const cleanupSql = `DELETE FROM cron.job_run_details
  WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname LIKE 'doudizhu_preview_%')
    AND end_time < now() - interval '7 days'`;
async function store(name, value) {
  const rows =
    await db.$queryRaw`SELECT id FROM vault.secrets WHERE name = ${name} LIMIT 1`;
  if (rows.length)
    await db.$queryRaw`SELECT vault.update_secret(${rows[0].id}::uuid, ${value})`;
  else
    await db.$queryRaw`SELECT vault.create_secret(${value}, ${name}, 'Dou Dizhu Preview scheduler')`;
}
try {
  // These extensions already serve the other Preview game schedulers.
  const installed =
    await db.$queryRaw`SELECT extname FROM pg_extension WHERE extname IN ('pg_cron','pg_net','supabase_vault')`;
  if (installed.length !== 3)
    throw new Error("Preview scheduler extensions are missing.");
  await db.$transaction(async (tx) => {
    const tables =
      await tx.$queryRaw`SELECT count(*)::int AS count FROM pg_class WHERE relnamespace='public'::regnamespace AND relname IN ('DdzCommand','DdzRound','DdzEvent') AND relrowsecurity`;
    if (tables[0].count !== 3)
      throw new Error("Private Dou Dizhu migrations must be installed first.");
  });
  await store(endpointName, endpoint);
  await store(secretName, secret);
  await db.$queryRaw`SELECT cron.schedule('doudizhu_preview_deadlines', '2 seconds', ${dueSql})`;
  await db.$queryRaw`SELECT cron.schedule('doudizhu_preview_maintenance', '15 5 * * *', ${requestSql})`;
  await db.$queryRaw`SELECT cron.schedule('doudizhu_preview_cron_history_cleanup', '0 1 * * *', ${cleanupSql})`;
  const jobs =
    await db.$queryRaw`SELECT jobname,schedule,active FROM cron.job WHERE jobname IN ('doudizhu_preview_deadlines','doudizhu_preview_maintenance','doudizhu_preview_cron_history_cleanup') ORDER BY jobname`;
  if (jobs.length !== 3 || jobs.some((job) => !job.active))
    throw new Error("Preview scheduler did not activate.");
  console.log(
    JSON.stringify({ previewHost, previewRef, preflight, jobs }, null, 2),
  );
} finally {
  await db.$disconnect();
}
