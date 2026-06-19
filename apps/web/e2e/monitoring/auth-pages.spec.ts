import { test } from "@playwright/test";
import {
  collectPageIssues,
  expectHealthyPage,
} from "../utils/monitoringAssertions";

const authStorageState = process.env.PLAYWRIGHT_AUTH_STORAGE_STATE || undefined;

const authPages = [
  { name: "notifications", path: "/zh-CN/notifications" },
  { name: "messages", path: "/zh-CN/messages" },
  { name: "profile", path: "/zh-CN/profile" },
];

test.describe("authenticated site monitoring", () => {
  test.skip(
    !authStorageState,
    "Set PLAYWRIGHT_AUTH_STORAGE_STATE to enable authenticated monitoring.",
  );
  test.use({ storageState: authStorageState });

  for (const item of authPages) {
    test(`${item.name} renders for a signed-in monitor user`, async ({
      page,
    }) => {
      const issues = collectPageIssues(page);

      await expectHealthyPage(page, item.path);

      issues.assertNoCriticalIssues();
    });
  }
});
