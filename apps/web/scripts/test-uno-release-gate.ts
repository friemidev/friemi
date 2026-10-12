/** Run with: node --conditions=react-server --import tsx scripts/test-uno-release-gate.ts */
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

// Production is playable, but anonymous and cross-origin requests must stop
// before Prisma or the network. Keep this check entirely local.
let databaseTouches = 0;
let networkTouches = 0;
const globals = globalThis as typeof globalThis & { prisma?: unknown };
const previousPrisma = globals.prisma;
const previousFetch = globalThis.fetch;
const previousEnvironment = {
  NODE_ENV: process.env.NODE_ENV,
  VERCEL_ENV: process.env.VERCEL_ENV,
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
  CLERK_SECRET_KEY: process.env.CLERK_SECRET_KEY,
  CRON_SECRET: process.env.CRON_SECRET,
};
process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY = "uno-local-test-key";
process.env.CLERK_SECRET_KEY = "uno-local-test-secret";
process.env.CRON_SECRET = "uno-local-release-check";
globals.prisma = new Proxy({}, { get() { databaseTouches += 1; throw new Error("Production UNO touched Prisma"); } });
globalThis.fetch = async () => { networkTouches += 1; throw new Error("Production UNO made a network request"); };

type RouteHandler = (request: Request, context: { params: Promise<{ roomId: string }> }) => Promise<Response>;
const handlers: Array<{ method: string; path: string; handler: RouteHandler }> = [];
// Bundle local dynamic imports like Next's server build. Supply an anonymous
// Clerk identity and a navigation tripwire; run the actual UNO auth and routes.
const requireRoute = createRequire(import.meta.url);
const scratch = await mkdtemp(fileURLToPath(new URL("../.uno-release-check-", import.meta.url)));
const add = async (path: string, modulePath: string, methods: string[]) => {
  const bundlePath = resolve(scratch, `route-${handlers.length}.cjs`);
  await build({
    entryPoints: [fileURLToPath(new URL(`${modulePath}.ts`, import.meta.url))],
    outfile: bundlePath,
    bundle: true,
    platform: "node",
    format: "cjs",
    packages: "external",
    logLevel: "silent",
    plugins: [{
      name: "anonymous-clerk-identity",
      setup(builder) {
        builder.onResolve({ filter: /^@clerk\/nextjs\/server$/ }, () => ({ path: "anonymous-clerk", namespace: "uno-test" }));
        builder.onResolve({ filter: /^next\/navigation$/ }, () => ({ path: "unreachable-navigation", namespace: "uno-test" }));
        builder.onLoad({ filter: /.*/, namespace: "uno-test" }, ({ path }) => ({
          contents: path === "anonymous-clerk"
            ? "export async function auth() { return { userId: null }; } export async function currentUser() { return null; }"
            : "export function redirect() { throw new Error('Anonymous UNO route attempted navigation'); }",
          loader: "js",
        }));
      },
    }],
  });
  const route = requireRoute(bundlePath);
  for (const method of methods) handlers.push({ path, method, handler: route[method] });
};

try {
  await add("/api/game-tools/uno/rooms", "../app/api/game-tools/uno/rooms/route", ["POST"]);
  await add("/api/game-tools/uno/join", "../app/api/game-tools/uno/join/route", ["POST"]);
  await add("/api/game-tools/uno/rooms/blocked", "../app/api/game-tools/uno/rooms/[roomId]/route", ["GET", "PATCH"]);
  for (const [path, method] of [["actions", "POST"], ["character", "PATCH"], ["history", "GET"], ["leave", "POST"], ["reactions", "POST"], ["ready", "POST"], ["return", "POST"]]) {
    await add(`/api/game-tools/uno/rooms/blocked/${path}`, `../app/api/game-tools/uno/rooms/[roomId]/${path}/route`, [method]);
  }
  await add("/api/cron/uno-deadlines", "../app/api/cron/uno-deadlines/route", ["GET"]);

  let checks = 0;
  for (const environment of [
    { NODE_ENV: "production", VERCEL_ENV: "production" },
    { NODE_ENV: "development", VERCEL_ENV: "production" },
    { NODE_ENV: "production", VERCEL_ENV: undefined },
  ]) {
    Object.assign(process.env, { NODE_ENV: environment.NODE_ENV });
    if (environment.VERCEL_ENV === undefined) delete process.env.VERCEL_ENV;
    else process.env.VERCEL_ENV = environment.VERCEL_ENV;
    for (const { path, method, handler } of handlers) {
      const cases: Array<{ headers: HeadersInit; status: number; error: string }> = method === "GET"
        ? [{ headers: {}, status: 401, error: path.startsWith("/api/cron/") ? "UNAUTHORIZED" : "SIGN_IN_REQUIRED" }]
        : [
            { headers: {}, status: 403, error: "INVALID_ORIGIN" },
            { headers: { origin: "https://friemi.test" }, status: 401, error: "SIGN_IN_REQUIRED" },
          ];
      for (const { headers, status, error } of cases) {
        const response = await handler(new Request(`https://friemi.test${path}`, { method, headers }), { params: Promise.resolve({ roomId: "blocked" }) });
        assert.equal(response.status, status, `${method} ${path} must enforce access in ${JSON.stringify(environment)}`);
        assert.deepEqual(await response.json(), { error });
        assert.equal(response.headers.get("cache-control"), "private, no-store");
        checks += 1;
      }
    }
  }
  assert.equal(databaseTouches, 0);
  assert.equal(networkTouches, 0);
  console.log(`UNO production early access: ${checks} route access checks passed; no database or network access.`);
} finally {
  globals.prisma = previousPrisma;
  globalThis.fetch = previousFetch;
  for (const [key, value] of Object.entries(previousEnvironment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  await rm(scratch, { recursive: true, force: true });
}
