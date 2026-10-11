const endpoint = process.env.UNO_DEADLINE_ENDPOINT;
const secret = process.env.CRON_SECRET;
const intervalMs = Number(process.env.UNO_DEADLINE_INTERVAL_MS ?? "5000");
if (!endpoint || !secret) throw new Error("Set UNO_DEADLINE_ENDPOINT and CRON_SECRET.");
const url = new URL(endpoint);
if (url.protocol !== "https:" && !(url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname))) throw new Error("Use HTTPS, except on localhost.");
if (!url.pathname.endsWith("/api/cron/uno-deadlines")) throw new Error("UNO_DEADLINE_ENDPOINT must point to /api/cron/uno-deadlines.");
if (!Number.isInteger(intervalMs) || intervalMs < 2000 || intervalMs > 60000) throw new Error("UNO_DEADLINE_INTERVAL_MS must be between 2000 and 60000.");
let running = true;
process.on("SIGINT", () => { running = false; });
process.on("SIGTERM", () => { running = false; });
do {
  try {
    const response = await fetch(url, { headers: { authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new Error(`Deadline sweep returned ${response.status}`);
    const result = await response.json();
    if (result.scanned || result.advanced || result.errors) console.log(new Date().toISOString(), result);
  } catch (error) {
    // Do not print request objects: they contain the scheduler secret.
    console.error(new Date().toISOString(), error instanceof Error ? error.message : "Deadline sweep failed");
    if (process.argv.includes("--once")) process.exitCode = 1;
  }
  if (process.argv.includes("--once") || !running) break;
  await new Promise((resolve) => setTimeout(resolve, intervalMs));
} while (running);
