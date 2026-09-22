import { defineConfig, devices } from "@playwright/test";

const localPort = process.env.PLAYWRIGHT_MONITOR_PORT ?? "3100";
const externalBaseUrl = process.env.PLAYWRIGHT_MONITOR_BASE_URL;
const baseURL = externalBaseUrl ?? `http://127.0.0.1:${localPort}`;
const configuredWorkers = Number.parseInt(
  process.env.PLAYWRIGHT_MONITOR_WORKERS ?? "",
  10,
);
const enableWebkit = process.env.PLAYWRIGHT_MONITOR_WEBKIT === "1";

const mobileDevice = devices["Pixel 5"];

function mobileViewportProject(
  name: string,
  viewport: { height: number; width: number },
  deviceScaleFactor: number,
) {
  return {
    name,
    use: {
      ...mobileDevice,
      browserName: "chromium" as const,
      deviceScaleFactor,
      viewport,
    },
  };
}

export default defineConfig({
  testDir: "./e2e/monitoring",
  timeout: 45_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  workers: Number.isFinite(configuredWorkers)
    ? Math.max(1, configuredWorkers)
    : 2,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [
    ["list"],
    ["html", { open: "never", outputFolder: "playwright-report" }],
  ],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  projects: [
    {
      name: "chromium-desktop",
      use: {
        ...devices["Desktop Chrome"],
        viewport: { width: 1440, height: 1000 },
      },
    },
    mobileViewportProject(
      "chromium-mobile-compact-320x568",
      { width: 320, height: 568 },
      2,
    ),
    mobileViewportProject(
      "chromium-mobile-classic-375x667",
      { width: 375, height: 667 },
      2,
    ),
    mobileViewportProject(
      "chromium-mobile-notch-375x812",
      { width: 375, height: 812 },
      3,
    ),
    mobileViewportProject(
      "chromium-mobile-standard-393x851",
      { width: 393, height: 851 },
      3,
    ),
    mobileViewportProject(
      "chromium-mobile-large-430x932",
      { width: 430, height: 932 },
      3,
    ),
    ...(enableWebkit
      ? [
          {
            name: "webkit-mobile-iphone-se-320x568",
            use: {
              ...devices["iPhone SE"],
              browserName: "webkit" as const,
            },
          },
          {
            name: "webkit-mobile-iphone-8-375x667",
            use: {
              ...devices["iPhone 8"],
              browserName: "webkit" as const,
            },
          },
        ]
      : []),
  ],
  webServer: externalBaseUrl
    ? undefined
    : {
        command: `npm run dev -- --port ${localPort}`,
        reuseExistingServer: true,
        timeout: 120_000,
        url: baseURL,
      },
});
