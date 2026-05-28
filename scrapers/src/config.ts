import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = dirname(fileURLToPath(import.meta.url));
export const repoRoot = resolve(currentDir, "..", "..");

function parseDotenv(content: string) {
  const values: Record<string, string> = {};
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eqIndex = line.indexOf("=");
    if (eqIndex === -1) continue;
    const key = line.slice(0, eqIndex).trim();
    let value = line.slice(eqIndex + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

export function loadEnvFiles() {
  const configured = process.env.SCRAPERS_ENV_FILE?.trim();
  const candidates = configured
    ? [resolve(repoRoot, configured)]
    : [
        resolve(repoRoot, "apps", "web", ".env.local"),
        resolve(repoRoot, ".env.local"),
        resolve(repoRoot, "scrapers", ".env.local"),
      ];

  for (const filePath of candidates) {
    if (!existsSync(filePath)) continue;
    const parsed = parseDotenv(readFileSync(filePath, "utf8"));
    for (const [key, value] of Object.entries(parsed)) {
      if (process.env[key] === undefined || process.env[key] === "") {
        process.env[key] = value;
      }
    }
    return filePath;
  }

  return null;
}

export function getSetting(name: string, fallback: string) {
  const value = process.env[name]?.trim();
  return value ? value : fallback;
}

export function getNumberSetting(name: string, fallback: number) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export function getBoolSetting(name: string, fallback = false) {
  const value = process.env[name]?.trim().toLowerCase();
  if (!value) return fallback;
  return ["1", "true", "yes", "on"].includes(value);
}

export function getScraperConfig() {
  const envFile = loadEnvFiles();
  return {
    envFile,
    databaseUrl: process.env.DATABASE_URL?.trim() || "",
    organizerClerkUserId: getSetting("SCRAPER_ORGANIZER_CLERK_USER_ID", "scraper-import-bot"),
    organizerNickname: getSetting("SCRAPER_ORGANIZER_NICKNAME", "Imported Paris Events"),
    maxSortirPages: getNumberSetting("SCRAPER_MAX_SORTIR_PAGES", 3),
    maxSortirArticles: getNumberSetting("SCRAPER_MAX_SORTIR_ARTICLES", 24),
    maxPlayInEvents: getNumberSetting("SCRAPER_MAX_PLAYIN_EVENTS", 30),
    timeoutMs: getNumberSetting("SCRAPER_TIMEOUT_MS", 30000),
    delayMs: getNumberSetting("SCRAPER_DELAY_MS", 800),
    defaultCapacity: getNumberSetting("SCRAPER_DEFAULT_CAPACITY", 100),
    dryRun: getBoolSetting("SCRAPER_DRY_RUN", false),
  };
}
