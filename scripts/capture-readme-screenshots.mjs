import { mkdir } from "node:fs/promises";
import path from "node:path";
import { chromium } from "@playwright/test";

const baseUrl = process.env.README_SCREENSHOT_BASE_URL ?? "http://localhost:3100";
const locale = process.env.README_SCREENSHOT_LOCALE ?? "zh-CN";
const outputDir =
  process.env.README_SCREENSHOT_OUTPUT_DIR ??
  path.join("apps", "web", "public", "readme", "v2_4");

const viewport = {
  width: Number.parseInt(process.env.README_SCREENSHOT_WIDTH ?? "390", 10),
  height: Number.parseInt(process.env.README_SCREENSHOT_HEIGHT ?? "844", 10),
};

const pages = [
  {
    name: "mobile-home",
    path: `/${locale}/mobile-home`,
    waitFor: ".mobile-v23-home, main, body",
  },
  {
    name: "lobby",
    path: `/${locale}/lobby`,
    waitFor: ".mobile-v23-lobby, main, body",
  },
  {
    name: "activities",
    path: `/${locale}/activities`,
    waitFor: "main, body",
  },
  {
    name: "footprints",
    path: `/${locale}/footprints`,
    waitFor: "main, body",
  },
  {
    name: "game-tools",
    path: `/${locale}/game-tools`,
    waitFor: "main, body",
  },
];

const authenticatedPages =
  process.env.README_SCREENSHOT_INCLUDE_AUTH_PAGES === "1"
    ? [
        {
          name: "create-hangout",
          path: `/${locale}/activities/new?mode=form`,
          waitFor: "main, form, body",
        },
        {
          name: "profile",
          path: `/${locale}/profile`,
          waitFor: "main, body",
        },
      ]
    : [];

function toUrl(routePath) {
  return new URL(routePath, baseUrl).toString();
}

async function hideDebugOverlays(page) {
  await page.addStyleTag({
    content: `
      nextjs-portal,
      [data-nextjs-toast],
      [data-nextjs-dialog-overlay],
      [data-vercel-feedback],
      [data-vercel-insights-debug],
      .vercel-live-feedback,
      .__next-dev-overlay {
        display: none !important;
      }
      body {
        background: #eef4fb !important;
      }
    `,
  });
}

async function capturePage(page, item) {
  await page.goto(toUrl(item.path), {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await hideDebugOverlays(page);
  await page.waitForSelector(item.waitFor, { timeout: 20000 }).catch(() => {});
  await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(outputDir, `${item.name}.png`),
    fullPage: false,
  });
}

async function captureFirstDetailFrom(page, sourcePath, linkPattern, outputName) {
  await page.goto(toUrl(sourcePath), {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await hideDebugOverlays(page);
  await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => {});
  const href = await page
    .locator("a")
    .evaluateAll((links, pattern) => {
      const matcher = new RegExp(pattern);
      const match = links.find((link) => {
        const href = link.getAttribute("href") ?? "";
        return matcher.test(href);
      });

      return match?.getAttribute("href") ?? null;
    }, linkPattern)
    .catch(() => null);

  if (!href) {
    console.warn(`No detail link matched ${linkPattern} from ${sourcePath}`);
    return null;
  }

  await page.goto(new URL(href, baseUrl).toString(), {
    waitUntil: "domcontentloaded",
    timeout: 60000,
  });
  await hideDebugOverlays(page);
  await page.waitForLoadState("networkidle", { timeout: 12000 }).catch(() => {});
  await page.waitForTimeout(800);
  await page.screenshot({
    path: path.join(outputDir, `${outputName}.png`),
    fullPage: false,
  });

  return href;
}

await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport,
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  locale,
  userAgent:
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
});
const page = await context.newPage();

for (const item of pages) {
  console.log(`Capturing ${item.name}...`);
  await capturePage(page, item);
}

for (const item of authenticatedPages) {
  console.log(`Capturing authenticated page ${item.name}...`);
  await capturePage(page, item);
}

console.log("Capturing lobby detail...");
await captureFirstDetailFrom(
  page,
  `/${locale}/lobby`,
  `^/${locale}/lobby/[^/?#]+`,
  "lobby-detail",
);

console.log("Capturing public event detail...");
await captureFirstDetailFrom(
  page,
  `/${locale}/activities`,
  `^/${locale}/public-events/[^/?#]+`,
  "activity-detail",
);

if (process.env.README_SCREENSHOT_INCLUDE_AUTH_PAGES === "1") {
  console.log("Capturing profile from footprints...");
  await captureFirstDetailFrom(
    page,
    `/${locale}/footprints`,
    `^/${locale}/profile/[^/?#]+`,
    "profile",
  );
}

await browser.close();
