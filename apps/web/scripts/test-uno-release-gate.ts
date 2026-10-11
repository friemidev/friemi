/** Run with: node --conditions=react-server --import tsx scripts/test-uno-release-gate.ts */
import assert from "node:assert/strict";

// Production routes must stop before touching identity, Prisma or the network.
// Inject a tripwire rather than connecting this check to any database.
let databaseTouches = 0;
let networkTouches = 0;
const globals = globalThis as typeof globalThis & { prisma?: unknown };
const previousPrisma = globals.prisma;
const previousFetch = globalThis.fetch;
const previousEnvironment = { NODE_ENV: process.env.NODE_ENV, VERCEL_ENV: process.env.VERCEL_ENV };
globals.prisma = new Proxy({}, { get() { databaseTouches += 1; throw new Error("Production UNO touched Prisma"); } });
globalThis.fetch = async () => { networkTouches += 1; throw new Error("Production UNO made a network request"); };

type RouteHandler = (request: Request, context: { params: Promise<{ roomId: string }> }) => Promise<Response>;
const handlers: Array<{ method: string; path: string; handler: RouteHandler }> = [];
const add = async (path: string, modulePath: string, methods: string[]) => {
  const route = await import(modulePath);
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
      const response = await handler(new Request(`https://friemi.test${path}`, { method }), { params: Promise.resolve({ roomId: "blocked" }) });
      assert.equal(response.status, 404, `${method} ${path} must be closed in ${JSON.stringify(environment)}`);
      assert.deepEqual(await response.json(), { error: "UNO_NOT_AVAILABLE" });
      assert.equal(response.headers.get("cache-control"), "private, no-store");
      checks += 1;
    }
  }
  assert.equal(databaseTouches, 0);
  assert.equal(networkTouches, 0);
  console.log(`UNO production gate: ${checks} route checks passed; no database or network access.`);
} finally {
  globals.prisma = previousPrisma;
  globalThis.fetch = previousFetch;
  for (const [key, value] of Object.entries(previousEnvironment)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}
