import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { createClerkClient } from "@clerk/backend";
import { chromium } from "playwright";

const origin = "https://friemi-git-codex-draw-and-guess-friemi.vercel.app";
assert.ok(process.env.DATABASE_URL?.includes("dryhbxognbrljslzciuh"));
assert.ok(process.env.CLERK_SECRET_KEY?.startsWith("sk_test_"));
const databaseUrl = new URL(process.env.DATABASE_URL);
databaseUrl.searchParams.set("connection_limit", "10");
process.env.DATABASE_URL = databaseUrl.toString();
const { prisma } = await import("../lib/prisma.ts");
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const users = [];
const sessions = [];
let browser;
let roomId;
let step = "setup";

async function cleanup() {
  const profileIds = users.map((user) => user.profileId).filter(Boolean);
  if (roomId) await prisma.gameToolRoom.deleteMany({ where: { id: roomId } });
  if (profileIds.length) await prisma.userProfile.deleteMany({ where: { id: { in: profileIds } } });
  for (const user of users) await clerk.users.deleteUser(user.userId);
  await browser?.close();
  await prisma.$disconnect();
  console.log(`Preview relay browser cleanup: ${roomId ? 1 : 0} room, ${profileIds.length} profiles, ${users.length} Clerk users`);
}

async function roomSnapshot() {
  const response = await sessions[0].context.request.get(`${origin}/api/game-tools/draw-guess/rooms/${roomId}`);
  assert.equal(response.status(), 200);
  return (await response.json()).room;
}

async function drawAndSubmit(page) {
  await page.getByRole("heading", { name: "Draw the previous word" }).waitFor({ timeout: 25_000 });
  const canvas = page.locator('svg[aria-label="Drawing canvas"]');
  await canvas.scrollIntoViewIfNeeded();
  const bounds = await canvas.boundingBox();
  assert.ok(bounds);
  await page.mouse.move(bounds.x + bounds.width * 0.25, bounds.y + bounds.height * 0.3);
  await page.mouse.down();
  await page.mouse.move(bounds.x + bounds.width * 0.55, bounds.y + bounds.height * 0.55, { steps: 8 });
  await page.mouse.up();
  await page.getByRole("button", { name: "Pass it on" }).click();
}

try {
  const stamp = randomUUID().replaceAll("-", "").slice(0, 12);
  for (let seat = 0; seat < 2; seat += 1) {
    const email = `relay-ui-${stamp}-${seat}+clerk_test@example.com`;
    const password = `${randomBytes(24).toString("base64url")}Aa9!`;
    const user = await clerk.users.createUser({ emailAddress: [email], firstName: "Relay", lastName: String(seat + 1), password, skipPasswordChecks: true });
    const record = { email, password, userId: user.id, profileId: null };
    users.push(record);
    const profile = await prisma.userProfile.create({ data: { clerkUserId: user.id, nickname: `Relay UI ${seat + 1}` } });
    record.profileId = profile.id;
  }
  browser = await chromium.launch({ headless: true });
  mkdirSync("../../output/playwright", { recursive: true });
  for (let seat = 0; seat < 2; seat += 1) {
    step = `sign in player ${seat + 1}`;
    const context = await browser.newContext({ viewport: seat ? { width: 390, height: 844 } : { width: 1280, height: 900 } });
    const page = await context.newPage();
    sessions.push({ context, page });
    await page.goto(`${origin}/en/sign-in?redirect_url=%2Fen%2Fgame-tools%2Fdraw-guess`, { waitUntil: "domcontentloaded" });
    await page.getByRole("textbox", { name: "Email address" }).fill(users[seat].email);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("textbox", { name: "Password" }).fill(users[seat].password);
    await page.getByRole("button", { name: "Continue" }).click();
    const verification = page.getByRole("textbox", { name: "Enter verification code" });
    await verification.waitFor({ state: "visible", timeout: 15_000 }).catch(() => undefined);
    if (await verification.isVisible()) await verification.fill("424242");
    await page.waitForURL(`${origin}/en/game-tools/draw-guess`, { timeout: 30_000 });
  }
  const host = sessions[0].page;
  const guest = sessions[1].page;
  step = "create two-person room";
  const count = host.getByRole("combobox", { name: /Players/ });
  assert.equal(await count.inputValue(), "2");
  assert.deepEqual(await count.locator("option").allTextContents(), ["2 players", "5 players", "6 players", "7 players", "8 players"]);
  await host.getByRole("button", { name: "Create room" }).click();
  await host.waitForURL(/\/en\/game-tools\/draw-guess\/rooms\//, { timeout: 30_000 });
  roomId = new URL(host.url()).pathname.split("/").at(-1);
  const code = (await host.locator("main strong").first().innerText()).trim();
  assert.match(code, /^[A-Z0-9]{6}$/);
  await host.getByText("Two people plus an automatic helper", { exact: false }).waitFor();
  assert.match(await host.locator("main").innerText(), /1 \/ 2 people/);
  await host.screenshot({ path: "../../output/playwright/relay-duo-lobby-desktop.png" });
  step = "join second human";
  await guest.goto(`${origin}/en/game-tools/draw-guess/join/${code}`);
  await guest.waitForURL(`${origin}/en/game-tools/draw-guess/rooms/${roomId}`, { timeout: 30_000 });
  await guest.getByText("Two people plus an automatic helper", { exact: false }).waitFor();
  await guest.screenshot({ path: "../../output/playwright/relay-duo-lobby-mobile.png" });
  step = "start and submit starting words";
  await host.getByRole("button", { name: "Start game" }).waitFor({ state: "visible", timeout: 20_000 });
  await host.getByRole("button", { name: "Start game" }).click();
  for (const [seat, page] of [host, guest].entries()) {
    await page.getByRole("heading", { name: "Write a starting word" }).waitFor({ timeout: 20_000 });
    await page.getByRole("textbox", { name: "Write a starting word" }).fill(seat ? "red balloon" : "blue whale");
    await page.getByRole("button", { name: "Pass it on" }).click();
  }
  step = "draw both relay pictures";
  for (const page of [host, guest]) await drawAndSubmit(page);
  step = "guess both relay pictures";
  for (const page of [host, guest]) {
    await page.getByRole("heading", { name: "Guess from this picture" }).waitFor({ timeout: 25_000 });
    await page.getByRole("textbox", { name: "Guess from this picture" }).fill("blue whale");
    await page.getByRole("button", { name: "Pass it on" }).click();
  }
  step = "vote on all chains";
  await host.getByText("Does the ending match?").first().waitFor({ timeout: 25_000 });
  for (let owner = 0; owner < 3; owner += 1) {
    for (const page of [host, guest]) await page.getByRole("button", { name: "Matches", exact: true }).nth(owner).click();
  }
  step = "pick best artwork and finish";
  await host.getByRole("button", { name: /Pick your favorite drawing/ }).waitFor({ timeout: 25_000 });
  await host.getByRole("button", { name: /Pick your favorite drawing/ }).click();
  await host.getByRole("heading", { name: "Leaderboard" }).waitFor({ timeout: 25_000 });
  await guest.getByRole("heading", { name: "Leaderboard" }).waitFor({ timeout: 25_000 });
  const finished = await roomSnapshot();
  assert.equal(finished.view.phase, "FINISHED");
  assert.equal(finished.view.scores[2], 0);
  assert.deepEqual(finished.view.voteCounts, Array.from({ length: 3 }, () => ({ yes: 2, no: 0, abstain: 1 })));
  await host.screenshot({ path: "../../output/playwright/relay-duo-finished-desktop.png" });
  await guest.screenshot({ path: "../../output/playwright/relay-duo-finished-mobile.png" });
  step = "verify archived story and human-only ranking";
  await host.getByRole("link", { name: "Past games" }).click();
  await host.getByRole("heading", { name: "Past games and artwork" }).waitFor({ timeout: 20_000 });
  assert.equal(await host.locator("main ol").first().locator("li").count(), 2);
  await host.getByRole("link", { name: "Back to room" }).click();
  await host.getByRole("heading", { name: "Leaderboard" }).waitFor({ timeout: 20_000 });
  step = "rematch";
  await host.getByRole("button", { name: "Play again" }).click();
  await host.getByRole("heading", { name: "Write a starting word" }).waitFor({ timeout: 20_000 });
  assert.equal((await roomSnapshot()).view.gameNumber, 2);
  console.log("PASS deployed Preview two-human relay: join, drawing, guessing, vote, ranking, rematch");
} catch (error) {
  console.error(`FAIL Preview relay browser at ${step}:`, error);
  throw error;
} finally {
  await cleanup();
}
