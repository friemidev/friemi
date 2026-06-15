import { expect, test } from "@playwright/test";
import {
  collectPageIssues,
  expectHealthyPage,
} from "../utils/monitoringAssertions";

const mobilePages = [
  { name: "mobile lobby", path: "/zh-CN/lobby" },
  { name: "mobile activities", path: "/zh-CN/activities" },
  { name: "mobile search", path: "/zh-CN/search?q=paris" },
];

test.describe("mobile site monitoring", () => {
  for (const item of mobilePages) {
    test(`${item.name} renders without app crash`, async ({ page }) => {
      test.skip(
        !test.info().project.name.includes("mobile"),
        "Mobile monitoring only runs in the mobile project.",
      );
      const issues = collectPageIssues(page);

      await expectHealthyPage(page, item.path);

      const viewport = page.viewportSize();
      expect(viewport?.width).toBeLessThanOrEqual(430);
      issues.assertNoCriticalIssues();
    });
  }
});
