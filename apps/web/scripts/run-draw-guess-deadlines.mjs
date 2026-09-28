const endpoint = process.env.DRAW_GUESS_DEADLINE_ENDPOINT;
const secret = process.env.CRON_SECRET;
const intervalMs = Number(process.env.DRAW_GUESS_DEADLINE_INTERVAL_MS ?? "5000");

if (!endpoint || !secret) throw new Error("Set DRAW_GUESS_DEADLINE_ENDPOINT and CRON_SECRET.");
const url = new URL(endpoint);
if (url.protocol !== "https:" && !(url.protocol === "http:" && ["127.0.0.1", "localhost"].includes(url.hostname))) {
  throw new Error("The deadline endpoint must use HTTPS, except on localhost.");
}
if (!url.pathname.endsWith("/api/cron/draw-guess-deadlines")) {
  throw new Error("DRAW_GUESS_DEADLINE_ENDPOINT must point to the draw and guess deadline route.");
}
if (!Number.isInteger(intervalMs) || intervalMs < 2000 || intervalMs > 60000) {
  throw new Error("DRAW_GUESS_DEADLINE_INTERVAL_MS must be between 2000 and 60000.");
}

let running = true;
process.on("SIGINT", () => { running = false; });
process.on("SIGTERM", () => { running = false; });

async function sweep() {
  const response = await fetch(url, {
    headers: { authorization: `Bearer ${secret}` },
    signal: AbortSignal.timeout(15_000),
  });
  const result = await response.json();
  if (!response.ok) throw new Error(`Deadline sweep returned ${response.status}: ${JSON.stringify(result)}`);
  if (result.scanned || result.advanced || result.errors) console.log(new Date().toISOString(), result);
}

do {
  try { await sweep(); }
  catch (error) { console.error(new Date().toISOString(), error); if (process.argv.includes("--once")) process.exitCode = 1; }
  if (process.argv.includes("--once") || !running) break;
  await new Promise((resolve) => setTimeout(resolve, intervalMs));
} while (running);
