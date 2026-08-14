import assert from "node:assert/strict";
import test from "node:test";
import { withApiRequestMetrics } from "./apiRequestMetrics";

test("adds a safe request ID and duration header to API responses", async () => {
  const response = await withApiRequestMetrics(
    new Request("https://friemi.test/api/example", {
      headers: {
        "x-request-id": "preview-request-123",
      },
    }),
    "/api/example",
    async ({ requestId }) => {
      assert.equal(requestId, "preview-request-123");
      return Response.json({ ok: true });
    },
  );

  assert.equal(response.headers.get("x-request-id"), "preview-request-123");
  assert.match(
    response.headers.get("server-timing") ?? "",
    /^app;dur=\d+\.\d$/,
  );
});

test("replaces unsafe incoming request IDs", async () => {
  const response = await withApiRequestMetrics(
    new Request("https://friemi.test/api/example", {
      headers: {
        "x-request-id": "invalid request id",
      },
    }),
    "/api/example",
    async () => new Response(null, { status: 204 }),
  );

  assert.match(
    response.headers.get("x-request-id") ?? "",
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  );
});
