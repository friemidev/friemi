import { expect, type Page } from "@playwright/test";

type PageIssueCollector = {
  assertNoCriticalIssues: () => void;
};

type HealthyPageOptions = {
  maxLoadMs?: number;
  minBodyTextLength?: number;
};

const criticalBrowserIssuePattern =
  /(Application error|client-side exception|ChunkLoadError|Hydration failed|ReferenceError|TypeError|Unhandled Runtime Error)/i;

const configuredMaxLoadMs = Number.parseInt(
  process.env.PLAYWRIGHT_MONITOR_MAX_LOAD_MS ?? "",
  10,
);
const defaultMaxLoadMs = Number.isFinite(configuredMaxLoadMs)
  ? configuredMaxLoadMs
  : process.env.CI && process.env.PLAYWRIGHT_MONITOR_BASE_URL
    ? 10_000
    : 30_000;

function shouldFailOnConsoleMessage(text: string) {
  return (
    process.env.PLAYWRIGHT_MONITOR_FAIL_ON_ANY_CONSOLE_ERROR === "1" ||
    criticalBrowserIssuePattern.test(text)
  );
}

export function collectPageIssues(page: Page): PageIssueCollector {
  const criticalIssues: string[] = [];

  page.on("pageerror", (error) => {
    criticalIssues.push(`pageerror: ${error.message}`);
  });

  page.on("console", (message) => {
    if (message.type() !== "error") {
      return;
    }

    const text = message.text();

    if (shouldFailOnConsoleMessage(text)) {
      criticalIssues.push(`console.error: ${text}`);
    }
  });

  return {
    assertNoCriticalIssues() {
      expect(criticalIssues).toEqual([]);
    },
  };
}

export async function expectHealthyPage(
  page: Page,
  path: string,
  options: HealthyPageOptions = {},
) {
  const maxLoadMs = options.maxLoadMs ?? defaultMaxLoadMs;
  const minBodyTextLength = options.minBodyTextLength ?? 20;
  const startedAt = Date.now();
  const response = await page.goto(path, {
    waitUntil: "domcontentloaded",
    timeout: maxLoadMs,
  });
  const elapsedMs = Date.now() - startedAt;

  expect(response, `No HTTP response for ${path}`).not.toBeNull();
  expect(response?.status(), `${path} returned a server error`).toBeLessThan(500);
  expect(elapsedMs, `${path} exceeded ${maxLoadMs}ms`).toBeLessThanOrEqual(
    maxLoadMs,
  );

  const body = page.locator("body");
  await expect(body, `${path} did not render a body`).toBeVisible();
  await expect(body).not.toContainText(criticalBrowserIssuePattern);

  const bodyText = await body.innerText();
  expect(
    bodyText.trim().length,
    `${path} rendered too little visible text`,
  ).toBeGreaterThanOrEqual(minBodyTextLength);
}
