import { defineConfig, devices } from "@playwright/test";

const localPort = process.env.PLAYWRIGHT_MONITOR_PORT ?? "3100";
const externalBaseUrl = process.env.PLAYWRIGHT_MONITOR_BASE_URL;
const baseURL = externalBaseUrl ?? `http://127.0.0.1:${localPort}`;
const configuredWorkers = Number.parseInt(
  process.env.PLAYWRIGHT_MONITOR_WORKERS ?? "",
  10,
);

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
    {
      name: "chromium-mobile",
      use: {
        ...devices["Pixel 5"],
      },
    },
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
