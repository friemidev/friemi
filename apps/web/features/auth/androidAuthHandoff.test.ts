import assert from "node:assert/strict";
import { createHash, randomBytes } from "node:crypto";
import test from "node:test";
import {
  androidHandoffNamespace,
  androidHandoffTtlSeconds,
  consumeAndroidHandoff,
  consumeAndroidHandoffScript,
  issueAndroidHandoff,
  type AndroidHandoffStore,
} from "./androidAuthHandoff";
import {
  handleAndroidHandoff,
  type AndroidHandoffDependencies,
} from "./androidAuthHandoffHandler";

const flow = "a".repeat(32);
const verifier = randomBytes(32).toString("base64url");
const challenge = createHash("sha256").update(verifier).digest("base64url");
const origin = "https://www.friemi.com";

function fixture() {
  const values = new Map<string, { value: string; expiresAt: number }>();
  let now = 0;
  let issued = 0;
  const store: AndroidHandoffStore = {
    async set(key, value, { ex }) {
      values.set(key, { value, expiresAt: now + ex * 1000 });
      return "OK";
    },
    async eval(script, [key], [requestFlow, proof]) {
      if (script !== consumeAndroidHandoffScript) return ++issued;
      const item = values.get(key);
      if (!item || item.expiresAt <= now) return null;
      const data = JSON.parse(item.value);
      if (data.flow !== requestFlow || data.challenge !== proof) return null;
      values.delete(key);
      return JSON.stringify({ userId: data.userId, target: data.target });
    },
  };
  const tickets: string[] = [];
  const dependencies: AndroidHandoffDependencies = {
    getConfig: () => ({
      store,
      publishableKey: "pk_live_test",
      prefix: "test",
    }),
    getUserId: async () => "user_existing",
    createTicket: async (userId) => {
      tickets.push(userId);
      return "short-lived-ticket";
    },
  };
  return {
    store,
    values,
    dependencies,
    tickets,
    advance: (ms: number) => {
      now += ms;
    },
  };
}

function request(
  body: unknown,
  requestOrigin = origin,
  headers: Record<string, string> = {},
) {
  return new Request(`${requestOrigin}/api/auth/android-handoff`, {
    method: "POST",
    headers: {
      origin: requestOrigin,
      "content-type": "application/json",
      "sec-fetch-site": "same-origin",
      ...headers,
    },
    body: JSON.stringify(body),
  });
}
const issueBody = {
  action: "issue",
  flow,
  challenge,
  locale: "zh-CN",
  target: "/activities/existing",
};

test("handoff creates a short-lived code, not a session token, and redeems once", async () => {
  const { dependencies, tickets, values } = fixture();
  const issued = await handleAndroidHandoff(request(issueBody), dependencies);
  assert.equal(issued.status, 200);
  assert.equal(issued.headers.get("cache-control"), "private, no-store");
  const { code, ticket } = await issued.json();
  assert.match(code, /^[\w-]{43}$/);
  assert.equal(ticket, undefined);
  assert.equal(tickets.length, 0);
  assert.ok(![...values.keys()][0].includes(code));
  assert.ok(![...values.values()][0].value.includes(verifier));
  const redeem = { action: "redeem", code, flow, verifier };
  const responses = await Promise.all([
    handleAndroidHandoff(request(redeem), dependencies),
    handleAndroidHandoff(request(redeem), dependencies),
  ]);
  assert.deepEqual(responses.map((value) => value.status).sort(), [200, 400]);
  assert.deepEqual(
    await responses.find((value) => value.status === 200)!.json(),
    { ticket: "short-lived-ticket", target: "/zh-CN/activities/existing" },
  );
  assert.deepEqual(tickets, ["user_existing"]);
});

test("wrong device, flow or environment cannot consume another app's code", async () => {
  const { store } = fixture();
  const namespace = androidHandoffNamespace("test", "pk_live_test", origin);
  const code = await issueAndroidHandoff({
    store,
    namespace,
    flow,
    challenge,
    userId: "user_existing",
    target: "/fr/profile",
  });
  const input = { store, namespace, code, flow, verifier };
  assert.equal(
    await consumeAndroidHandoff({ ...input, verifier: "c".repeat(43) }),
    null,
  );
  assert.equal(
    await consumeAndroidHandoff({ ...input, flow: "c".repeat(32) }),
    null,
  );
  assert.equal(
    await consumeAndroidHandoff({
      ...input,
      namespace: androidHandoffNamespace("test", "pk_test_other", origin),
    }),
    null,
  );
  assert.equal(
    await consumeAndroidHandoff({
      ...input,
      namespace: androidHandoffNamespace(
        "test",
        "pk_live_test",
        "https://preview.example",
      ),
    }),
    null,
  );
  assert.deepEqual(await consumeAndroidHandoff(input), {
    userId: "user_existing",
    target: "/fr/profile",
  });
});

test("expired codes and malformed requests never create Clerk tickets", async () => {
  const { dependencies, advance, tickets } = fixture();
  const { code } = await (
    await handleAndroidHandoff(request(issueBody), dependencies)
  ).json();
  advance(androidHandoffTtlSeconds * 1000);
  assert.equal(
    (
      await handleAndroidHandoff(
        request({ action: "redeem", code, flow, verifier }),
        dependencies,
      )
    ).status,
    400,
  );
  for (const body of [
    {},
    { ...issueBody, userId: "attacker" },
    { ...issueBody, flow: "bad" },
    { ...issueBody, locale: "bad" },
    { ...issueBody, target: "x".repeat(5000) },
  ]) {
    assert.equal(
      (await handleAndroidHandoff(request(body), dependencies)).status,
      400,
    );
  }
  const malformed = new Request(`${origin}/api/auth/android-handoff`, {
    method: "POST",
    headers: { origin, "content-type": "application/json" },
    body: "bad json",
  });
  assert.equal(
    (await handleAndroidHandoff(malformed, dependencies)).status,
    400,
  );
  assert.deepEqual(tickets, []);
});

test("handoff rejects unauthenticated, cross-origin, form and rate-limited issuance", async () => {
  const { dependencies } = fixture();
  const anonymous = { ...dependencies, getUserId: async () => null };
  assert.equal(
    (await handleAndroidHandoff(request(issueBody), anonymous)).status,
    401,
  );
  const invalidHeaders: Array<Record<string, string>> = [
    { origin: "https://evil.example" },
    { origin: "null" },
    { origin: "" },
    { "sec-fetch-site": "cross-site" },
    { "sec-fetch-site": "same-site" },
  ];
  for (const headers of invalidHeaders) {
    assert.equal(
      (
        await handleAndroidHandoff(
          request(issueBody, origin, headers),
          dependencies,
        )
      ).status,
      403,
    );
  }
  assert.equal(
    (
      await handleAndroidHandoff(
        request(issueBody, origin, { "content-type": "text/plain" }),
        dependencies,
      )
    ).status,
    400,
  );
  for (let i = 0; i < 10; i++)
    assert.equal(
      (await handleAndroidHandoff(request(issueBody), dependencies)).status,
      200,
    );
  assert.equal(
    (await handleAndroidHandoff(request(issueBody), dependencies)).status,
    429,
  );
});

test("Redis failure and ineligible Clerk users fail closed", async () => {
  const { dependencies, store } = fixture();
  assert.equal(
    (
      await handleAndroidHandoff(request(issueBody), {
        ...dependencies,
        getConfig: () => ({ store: null, prefix: "test" }),
      })
    ).status,
    503,
  );
  const originalEval = store.eval;
  store.eval = async () => {
    throw new Error("unavailable");
  };
  assert.equal(
    (await handleAndroidHandoff(request(issueBody), dependencies)).status,
    503,
  );
  store.eval = originalEval;
  const { code } = await (
    await handleAndroidHandoff(request(issueBody), dependencies)
  ).json();
  const denied = { ...dependencies, createTicket: async () => null };
  assert.equal(
    (
      await handleAndroidHandoff(
        request({ action: "redeem", code, flow, verifier }),
        denied,
      )
    ).status,
    403,
  );
});

test("unsafe and recursive destinations fall back to the localized home", async () => {
  for (const target of [
    "https://evil.example",
    "/android-auth-return",
    "/en/android-auth-browser",
  ]) {
    const { dependencies } = fixture();
    const { code } = await (
      await handleAndroidHandoff(
        request({ ...issueBody, target }),
        dependencies,
      )
    ).json();
    const response = await handleAndroidHandoff(
      request({ action: "redeem", code, flow, verifier }),
      dependencies,
    );
    assert.equal((await response.json()).target, "/zh-CN/home");
  }
});
