import { disconnectPrisma, ensureImporterProfile, upsertActivities } from "./db.js";
import { getScraperConfig } from "./config.js";
import { scrapePlayInParis } from "./sources/playinparis.js";
import { scrapeSortirAParis } from "./sources/sortiraparis.js";

function printUsage() {
  console.log(`
Usage:
  npm run doctor
  npm run scrape -- [all|sortir|play] [--limit=N] [--pages=N]
  npm run sync -- [--dry-run]

Examples:
  npm run scrape -- all
  npm run scrape -- sortir --limit=12
  npm run sync -- --dry-run
`);
}

function parseArgs(argv: string[]) {
  const [command = "doctor", second, ...rest] = argv;
  const source = command === "scrape" && second && !second.startsWith("--") ? second : "all";
  const optionArgs = command === "scrape" && second && !second.startsWith("--") ? rest : [second, ...rest].filter((arg): arg is string => Boolean(arg));
  const flags = new Set(optionArgs.filter((arg) => arg.startsWith("--")));
  const limitArg = optionArgs.find((arg) => arg.startsWith("--limit="));
  const pagesArg = optionArgs.find((arg) => arg.startsWith("--pages="));
  return {
    command,
    source,
    dryRun: flags.has("--dry-run"),
    limit: limitArg ? Number(limitArg.split("=")[1]) : undefined,
    pages: pagesArg ? Number(pagesArg.split("=")[1]) : undefined,
  };
}

async function runDoctor() {
  const config = getScraperConfig();
  console.log("Scraper config:");
  console.log(JSON.stringify(
    {
      envFile: config.envFile,
      databaseUrl: config.databaseUrl ? "<loaded>" : "<missing>",
      organizerClerkUserId: config.organizerClerkUserId,
      organizerNickname: config.organizerNickname,
      maxSortirPages: config.maxSortirPages,
      maxSortirArticles: config.maxSortirArticles,
      maxPlayInEvents: config.maxPlayInEvents,
      timeoutMs: config.timeoutMs,
      delayMs: config.delayMs,
      defaultCapacity: config.defaultCapacity,
      dryRun: config.dryRun,
    },
    null,
    2,
  ));
}

async function runScrape(source: string, limit?: number, pages?: number) {
  const config = getScraperConfig();
  if (source === "play") {
    const summary = await scrapePlayInParis(limit ?? config.maxPlayInEvents, config.timeoutMs);
    console.log(JSON.stringify(summary, null, 2));
    return;
  }
  if (source === "sortir") {
    const summary = await scrapeSortirAParis(limit ?? config.maxSortirArticles, config.timeoutMs, pages ?? config.maxSortirPages);
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  const sortir = await scrapeSortirAParis(limit ?? config.maxSortirArticles, config.timeoutMs, pages ?? config.maxSortirPages);
  const play = await scrapePlayInParis(limit ?? config.maxPlayInEvents, config.timeoutMs);
  console.log(JSON.stringify({ sortiraparis: sortir, playinparis: play }, null, 2));
}

async function runSync(dryRun = false) {
  const config = getScraperConfig();
  if (!config.databaseUrl) {
    throw new Error("DATABASE_URL is missing. Check apps/web/.env.local or set SCRAPERS_ENV_FILE.");
  }

  const sortir = await scrapeSortirAParis(config.maxSortirArticles, config.timeoutMs, config.maxSortirPages);
  const play = await scrapePlayInParis(config.maxPlayInEvents, config.timeoutMs);
  const activities = [...sortir.activities, ...play.activities].sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

  console.log(`Collected ${activities.length} activities (${sortir.count} Sortir à Paris, ${play.count} Play in Paris).`);
  if (dryRun || config.dryRun) {
    console.log(JSON.stringify(activities, null, 2));
    return;
  }

  const organizer = await ensureImporterProfile({
    clerkUserId: config.organizerClerkUserId,
    nickname: config.organizerNickname,
  });
  const synced = await upsertActivities(organizer.id, activities);
  console.log(`Synced ${synced} activities to Supabase.`);
}

async function main() {
  const { command, source, dryRun, limit, pages } = parseArgs(process.argv.slice(2));

  try {
    switch (command) {
      case "doctor":
        await runDoctor();
        break;
      case "scrape":
        await runScrape(source, limit, pages);
        break;
      case "sync":
        await runSync(dryRun);
        break;
      default:
        printUsage();
        process.exitCode = 1;
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(message);
    process.exitCode = 1;
  } finally {
    if (command === "sync") {
      await disconnectPrisma();
    }
  }
}

void main();