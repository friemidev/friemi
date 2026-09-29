import { expect, test } from "@playwright/test";
import {
  collectPageIssues,
  expectHealthyPage,
} from "../utils/monitoringAssertions";

const mobilePages = [
  { name: "mobile home", path: "/zh-CN/mobile-home" },
  { name: "mobile lobby", path: "/zh-CN/lobby" },
  { name: "mobile activities", path: "/zh-CN/activities" },
  {
    name: "mobile message inbox",
    path: "/zh-CN/footprints?tab=message",
  },
  { name: "mobile search", path: "/zh-CN/search?q=paris" },
];

async function expectMobileLayoutFits(page: import("@playwright/test").Page) {
  await expect
    .poll(() =>
      page.evaluate(() => ({
        heightClass: document.documentElement.dataset.friemiViewportHeight,
        widthClass: document.documentElement.dataset.friemiViewportWidth,
      })),
    )
    .toEqual({
      heightClass: expect.any(String),
      widthClass: expect.any(String),
    });

  const layout = await page.evaluate(() => {
    const root = document.documentElement;
    const nav = document.querySelector<HTMLElement>(".app-mobile-nav");
    const navRect = nav?.getBoundingClientRect();
    const navVisible = Boolean(
      nav &&
      navRect &&
        navRect.width > 0 &&
        navRect.height > 0 &&
        window.getComputedStyle(nav).visibility !== "hidden",
    );

    return {
      clientWidth: root.clientWidth,
      scrollWidth: root.scrollWidth,
      viewportHeight: window.innerHeight,
      activityFilterFits: Array.from(
        document.querySelectorAll<HTMLElement>(
          "[data-mobile-activity-filters] > a",
        ),
      ).every((item) => {
        const rect = item.getBoundingClientRect();
        return rect.left >= -1 && rect.right <= root.clientWidth + 1;
      }),
      navRect: navVisible && navRect
        ? {
            bottom: navRect.bottom,
            left: navRect.left,
            right: navRect.right,
          }
        : null,
    };
  });

  expect(layout.scrollWidth).toBeLessThanOrEqual(layout.clientWidth + 1);
  expect(layout.activityFilterFits).toBe(true);
  if (layout.navRect) {
    expect(layout.navRect.left).toBeGreaterThanOrEqual(-1);
    expect(layout.navRect.right).toBeLessThanOrEqual(layout.clientWidth + 1);
    expect(layout.navRect.bottom).toBeLessThanOrEqual(
      layout.viewportHeight + 1,
    );
  }
}

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
      await expectMobileLayoutFits(page);
      issues.assertNoCriticalIssues();
    });
  }
});
