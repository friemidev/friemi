import { test } from "@playwright/test";
import {
  collectPageIssues,
  expectHealthyPage,
} from "../utils/monitoringAssertions";

const publicPages = [
  { name: "home", path: "/zh-CN/home" },
  { name: "activities", path: "/zh-CN/activities" },
  { name: "lobby", path: "/zh-CN/lobby" },
  { name: "search", path: "/zh-CN/search?q=paris" },
];

test.describe("public site monitoring", () => {
  for (const item of publicPages) {
    test(`${item.name} renders without critical browser errors`, async ({
      page,
    }) => {
      test.skip(
        test.info().project.name.includes("mobile"),
        "Public desktop smoke runs in the desktop project; mobile coverage has its own suite.",
      );
      const issues = collectPageIssues(page);

      await expectHealthyPage(page, item.path);

      issues.assertNoCriticalIssues();
    });
  }
});
