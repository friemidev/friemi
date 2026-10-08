const endpoint = process.env.DRAW_GUESS_DEADLINE_ENDPOINT;
const secret = process.env.CRON_SECRET;
const directUrl = process.env.DIRECT_URL;
const expectedDbRef = process.env.DRAW_GUESS_PRODUCTION_DB_REF;
const productionHost = "www.friemi.com";
const previewDbRef = "dryhbxognbrljslzciuh";

if (!endpoint || !secret || !directUrl || !expectedDbRef) {
  throw new Error("Set DRAW_GUESS_DEADLINE_ENDPOINT, CRON_SECRET, DIRECT_URL and DRAW_GUESS_PRODUCTION_DB_REF.");
}
const target = new URL(endpoint);
const database = new URL(directUrl);
if (expectedDbRef === previewDbRef ||
  target.protocol !== "https:" || target.hostname !== productionHost ||
  target.pathname !== "/api/cron/draw-guess-deadlines" || target.search || target.hash ||
  database.protocol !== "postgresql:" || database.hostname !== `db.${expectedDbRef}.supabase.co`) {
  throw new Error("Production endpoint and database must match the explicitly selected production resources.");
}

const response = await fetch(target, {
  headers: { authorization: `Bearer ${secret}` },
  signal: AbortSignal.timeout(15_000),
});
if (!response.ok) throw new Error(`Production deadline endpoint rejected the configured secret (${response.status}).`);

// Extensions and cron jobs require the direct database connection.
process.env.DATABASE_URL = directUrl;
const { PrismaClient } = await import("@prisma/client");
const prisma = new PrismaClient();
const names = {
  endpoint: "draw_guess_production_deadline_endpoint",
  secret: "draw_guess_production_cron_secret",
};
const deadlineJobName = "draw_guess_production_deadlines";
const cleanupJobName = "draw_guess_production_cron_history_cleanup";
const command = `
  SELECT net.http_get(
    url := (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = '${names.endpoint}'),
    headers := jsonb_build_object('Authorization', 'Bearer ' ||
      (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = '${names.secret}')),
    timeout_milliseconds := 15000
  )
  WHERE EXISTS (
    SELECT 1 FROM public."GameToolRoom"
    WHERE kind = 'DRAW_GUESS' AND status = 'IN_PROGRESS'
      AND "drawGuessDeadlineAt" <= (now() AT TIME ZONE 'UTC')
  )
`;
const cleanupCommand = `
  DELETE FROM cron.job_run_details
  WHERE jobid IN (SELECT jobid FROM cron.job WHERE jobname LIKE 'draw_guess_production%')
    AND end_time < now() - interval '7 days'
`;

async function upsertVaultSecret(name, value) {
  const existing = await prisma.$queryRaw`SELECT id FROM vault.secrets WHERE name = ${name} LIMIT 1`;
  if (existing.length) {
    await prisma.$queryRaw`SELECT vault.update_secret(${existing[0].id}::uuid, ${value})`;
  } else {
    await prisma.$queryRaw`SELECT vault.create_secret(${value}, ${name}, 'Draw and guess production deadline worker')`;
  }
}

try {
  await prisma.$executeRawUnsafe("CREATE EXTENSION IF NOT EXISTS pg_cron");
  await prisma.$executeRawUnsafe("CREATE EXTENSION IF NOT EXISTS pg_net");
  await upsertVaultSecret(names.endpoint, endpoint);
  await upsertVaultSecret(names.secret, secret);
  await prisma.$queryRaw`SELECT cron.schedule(${deadlineJobName}, '5 seconds', ${command}) AS jobid`;
  await prisma.$queryRaw`SELECT cron.schedule(${cleanupJobName}, '0 1 * * *', ${cleanupCommand}) AS jobid`;
  const jobs = await prisma.$queryRaw`
    SELECT jobname, schedule, active FROM cron.job
    WHERE jobname IN (${deadlineJobName}, ${cleanupJobName}) ORDER BY jobname
  `;
  if (jobs.length !== 2 || jobs.some((job) => !job.active)) throw new Error("Production cron jobs were not activated.");
  console.log("Production deadline cron configured", { jobs });
} finally {
  await prisma.$disconnect();
}
