import { expect, test } from "@playwright/test";

test("health endpoint responds", async ({ request }) => {
  test.skip(
    test.info().project.name.includes("mobile"),
    "API health only needs to run once.",
  );
  const response = await request.get("/api/health", {
    timeout: 10_000,
  });

  expect(response.status()).toBeLessThan(500);
});
