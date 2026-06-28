import { expect, test } from "@playwright/test";
import {
  collectPageIssues,
  expectHealthyPage,
} from "../utils/monitoringAssertions";

const authStorageState = process.env.PLAYWRIGHT_AUTH_STORAGE_STATE || undefined;
const contactActivityPath =
  process.env.PLAYWRIGHT_CONTACT_ORGANIZER_ACTIVITY_PATH || undefined;

test.describe("activity organizer contact flow", () => {
  test.skip(
    !authStorageState || !contactActivityPath,
    "Set PLAYWRIGHT_AUTH_STORAGE_STATE and PLAYWRIGHT_CONTACT_ORGANIZER_ACTIVITY_PATH to enable this flow.",
  );
  test.use({ storageState: authStorageState });

  test("opens organizer conversation with activity context and sends the suggested message", async ({
    page,
  }) => {
    test.skip(
      test.info().project.name.includes("mobile"),
      "The full contact flow runs in the desktop project.",
    );
    const activityPath = contactActivityPath;

    if (!activityPath) {
      test.skip(true, "Missing contact activity path.");
      return;
    }

    const issues = collectPageIssues(page);

    await expectHealthyPage(page, activityPath, {
      minBodyTextLength: 100,
    });

    await page.getByRole("button", { name: /联系发起人|Message organizer|Contacter l'organisateur/i }).click();
    await expect(page).toHaveURL(/\/messages\/[^/?]+(\?.*)?$/);
    await expect(page.getByText(/关于这个组局|About this activity|À propos de cette sortie/i)).toBeVisible();

    const composer = page.getByRole("textbox");
    await expect(composer).toHaveValue(/\S+/);
    await page.getByRole("button", { name: /发送|Send|Envoyer/i }).click();
    await expect(composer).toHaveValue("");

    issues.assertNoCriticalIssues();
  });
});
