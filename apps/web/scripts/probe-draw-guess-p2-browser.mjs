import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { readFileSync, mkdirSync } from "node:fs";
import { createClerkClient } from "@clerk/backend";
import { chromium } from "playwright";

const origin = process.env.DRAW_GUESS_BROWSER_ORIGIN ?? "https://friemi-git-codex-draw-and-guess-friemi.vercel.app";
const playerCount = Number(process.env.P2_BROWSER_PLAYER_COUNT ?? 5);
assert.ok(playerCount === 2 || playerCount === 5);
const loginOrigin = process.env.DRAW_GUESS_BROWSER_LOGIN_ORIGIN ?? origin;
const allowedOrigin = "https://friemi-git-codex-draw-and-guess-friemi.vercel.app";
assert.ok([allowedOrigin, "http://localhost:3210"].includes(origin));
assert.ok([allowedOrigin, origin].includes(loginOrigin));
assert.ok(process.env.DATABASE_URL?.includes("dryhbxognbrljslzciuh"));
assert.ok(process.env.CLERK_SECRET_KEY?.startsWith("sk_test_"));
const databaseUrl = new URL(process.env.DATABASE_URL);
databaseUrl.searchParams.set("connection_limit", "10");
process.env.DATABASE_URL = databaseUrl.toString();
const { prisma } = await import("../lib/prisma.ts");
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const createdUsers = [];
async function cleanupCreatedUsers() {
  if (!createdUsers.length) return;
  const profileIds = createdUsers.map((user) => user.profileId).filter(Boolean);
  const rooms = await prisma.gameToolRoom.findMany({ where: { kind: "DRAW_GUESS", hostId: { in: profileIds } }, select: { id: true } });
  if (rooms.length) await prisma.gameToolRoom.deleteMany({ where: { id: { in: rooms.map((room) => room.id) } } });
  if (profileIds.length) await prisma.userProfile.deleteMany({ where: { id: { in: profileIds } } });
  for (const user of createdUsers) await clerk.users.deleteUser(user.userId);
  console.log(`P2 browser cleanup: ${rooms.length} rooms, ${profileIds.length} profiles, ${createdUsers.length} Clerk users`);
}
let credentials;
try {
  if (process.env.P2_BROWSER_CREDENTIALS_FILE) {
    credentials = JSON.parse(readFileSync(process.env.P2_BROWSER_CREDENTIALS_FILE, "utf8"));
  } else {
    const stamp = randomUUID().replaceAll("-", "").slice(0, 12);
    credentials = { users: [] };
    for (let index = 0; index < playerCount; index += 1) {
      const email = `p2-ui-${stamp}-${index}+clerk_test@example.com`;
      const password = `${randomBytes(24).toString("base64url")}Aa9!`;
      const user = await clerk.users.createUser({ emailAddress: [email], firstName: "P2 UI", lastName: index ? String(index + 1) : "Artist", password, skipPasswordChecks: true });
      const created = { userId: user.id, profileId: null };
      createdUsers.push(created);
      const profile = await prisma.userProfile.create({ data: { clerkUserId: user.id, nickname: index ? `P2 UI ${index + 1}` : "P2 UI Artist" } });
      created.profileId = profile.id;
      credentials.users.push({ email, password, userId: user.id, profileId: profile.id });
    }
  }
} catch (error) {
  await cleanupCreatedUsers();
  await prisma.$disconnect();
  throw error;
}
assert.equal(credentials.users.length, playerCount);
assert.ok(credentials.users.every((user) => /^p2-ui-[a-f0-9]{12}-[0-4]\+clerk_test@example\.com$/.test(user.email)));
mkdirSync("../../output/playwright", { recursive: true });

let browser;
const sessions = [];
let currentStep = "start";
async function until(check, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Timed out waiting for ${currentStep}`);
}
try {
  browser = await chromium.launch({ headless: true });
  for (let index = 0; index < credentials.users.length; index += 1) {
    currentStep = `sign in player ${index + 1}`;
    const context = await browser.newContext({
      viewport: index === 1 ? { width: 390, height: 844 } : { width: 1280, height: 900 },
      deviceScaleFactor: index === 1 ? 2 : 1,
      isMobile: index === 1,
      hasTouch: index === 1,
    });
    const page = await context.newPage();
    sessions.push({ context, page });
    if (index === 0) page.on("response", async (response) => {
      if (!response.url().includes("/game-tools/draw-guess/rooms")) return;
      if (response.request().method() !== "POST" && response.status() < 400) return;
      const kind = response.url().split("/").at(-1);
      const failure = response.status() >= 400 ? await response.json().catch(() => ({})) : null;
      console.log(`P2 host ${kind}: ${response.status()}`, failure?.error ?? "");
    });
    if (index === 0) page.on("pageerror", (error) => console.log("P2 host page error:", error.message));
    await page.goto(`${loginOrigin}/en/sign-in?redirect_url=%2Fen%2Fgame-tools%2Fdraw-guess`, { waitUntil: "domcontentloaded" });
    await page.getByRole("textbox", { name: "Email address" }).fill(credentials.users[index].email);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("textbox", { name: "Password" }).fill(credentials.users[index].password);
    await page.getByRole("button", { name: "Continue" }).click();
    const verification = page.getByRole("textbox", { name: "Enter verification code" });
    await verification.waitFor({ state: "visible", timeout: 15_000 }).catch(() => undefined);
    if (await verification.isVisible()) await verification.fill("424242");
    await page.waitForURL(`${loginOrigin}/en/game-tools/draw-guess`, { timeout: 30_000 });
    if (loginOrigin !== origin) {
      const cookies = await context.cookies(loginOrigin);
      await context.addCookies(cookies.map(({ name, value, expires, httpOnly, sameSite }) => ({
        name, value, expires, httpOnly, secure: origin.startsWith("https:"), sameSite, url: origin,
      })));
      await page.goto(`${origin}/en/game-tools/draw-guess`);
    }
    await page.getByRole("button", { name: /Speed guessing/ }).waitFor({ state: "visible", timeout: 20_000 });
    console.log(`P2 browser player ${index + 1}: signed in`);
  }
  currentStep = `create ${playerCount}-player room`;
  const host = sessions[0].page;
  await host.getByRole("button", { name: /Speed guessing/ }).click();
  const slider = host.getByRole("slider", { name: /Players/ });
  await slider.focus();
  await slider.press("Home");
  for (let count = Number(await slider.inputValue()); count < playerCount; count += 1) await slider.press("ArrowRight");
  assert.equal(await slider.inputValue(), String(playerCount));
  await host.getByRole("button", { name: "Create room" }).click();
  await host.waitForURL(/\/en\/game-tools\/draw-guess\/rooms\//, { timeout: 30_000 });
  const roomId = new URL(host.url()).pathname.split("/").at(-1);
  const roomCode = (await host.locator("main strong").first().innerText()).trim();
  assert.match(roomCode, /^[A-Z0-9]{6}$/);
  assert.match(await host.locator("main").innerText(), new RegExp(`1 / ${playerCount} Players`));
  console.log(`P2 browser room: ${roomId}, ${playerCount} seats`);
  for (let index = 1; index < sessions.length; index += 1) {
    currentStep = `join player ${index + 1}`;
    const page = sessions[index].page;
    await page.goto(`${origin}/en/game-tools/draw-guess/join/${roomCode}`);
    await page.waitForURL(`${origin}/en/game-tools/draw-guess/rooms/${roomId}`, { timeout: 30_000 });
    console.log(`P2 browser player ${index + 1}: joined room`);
  }
  currentStep = "start and choose first word";
  console.log("P2 browser visibility:", await Promise.all(sessions.map(({ page }) => page.evaluate(() => document.hidden))));
  await host.bringToFront();
  await host.getByRole("button", { name: "Start game" }).waitFor({ state: "visible", timeout: 20_000 });
  await until(async () => (await host.locator("main").innerText()).includes(`${playerCount} / ${playerCount} Players`), 15_000);
  console.log("P2 browser host lobby:", (await host.locator("main").innerText()).match(new RegExp(`\\d / ${playerCount} Players`))?.[0]);
  await host.getByRole("button", { name: "Start game" }).click();
  const chooseHeading = host.getByRole("heading", { name: "Choose a word to draw" });
  await chooseHeading.waitFor({ state: "visible", timeout: 20_000 });
  const wordButton = chooseHeading.locator("..").getByRole("button").first();
  const answer = (await wordButton.innerText()).trim();
  assert.ok(answer.length > 0);
  await wordButton.click();
  await host.getByText("Live ink connected").waitFor({ state: "visible", timeout: 20_000 });
  await sessions[1].page.getByText("Live ink connected").waitFor({ state: "visible", timeout: 20_000 });
  console.log(`P2 browser first turn: private ink connected on artist and viewer; answer length ${answer.length}`);
  currentStep = "mid-stroke realtime drawing";
  const canvas = host.locator('svg[aria-label="Drawing canvas"]');
  async function drawStroke(xFraction, yFraction, dx, dy, holdMs = 0) {
    await canvas.scrollIntoViewIfNeeded();
    const bounds = await canvas.boundingBox();
    assert.ok(bounds);
    const x = bounds.x + bounds.width * xFraction;
    const y = bounds.y + bounds.height * yFraction;
    await host.mouse.move(x, y);
    await host.mouse.down();
    await host.mouse.move(x + dx, y + dy, { steps: 5 });
    if (holdMs) await host.waitForTimeout(holdMs);
    return { x, y };
  }
  await drawStroke(0.25, 0.3, 40, 20, 250);
  const viewerArt = sessions[1].page.locator('svg[aria-label="Artwork"] path');
  await until(async () => (await viewerArt.count()) > 0, 5_000);
  console.log("P2 browser: observer saw path before pointer up");
  await host.mouse.up();
  currentStep = "undo and clear";
  const undo = host.getByRole("button", { name: "Undo last stroke" });
  await until(() => undo.isEnabled(), 10_000);
  await undo.click();
  await until(async () => (await viewerArt.count()) === 0, 8_000);
  await until(async () => (await canvas.locator("path").count()) === 0, 8_000);
  await host.getByRole("button", { name: "Color #173D32" }).waitFor({ state: "visible", timeout: 8_000 });
  console.log("P2 browser: undo cleared observer artwork");
  await drawStroke(0.3, 0.4, 50, 15);
  await host.mouse.up();
  const clear = host.getByRole("button", { name: "Clear drawing" });
  await until(() => clear.isEnabled(), 10_000);
  await until(async () => (await viewerArt.count()) > 0, 8_000);
  await clear.click();
  await until(async () => (await viewerArt.count()) === 0, 8_000);
  await until(async () => (await canvas.locator("path").count()) === 0, 8_000);
  await host.getByRole("button", { name: "Color #173D32" }).waitFor({ state: "visible", timeout: 8_000 });
  console.log("P2 browser: clear reached observer artwork");
  currentStep = "disconnect and recover";
  await drawStroke(0.45, 0.55, 55, 25);
  await host.mouse.up();
  await until(async () => (await viewerArt.count()) > 0, 8_000);
  const beforeReconnect = await viewerArt.first().getAttribute("d");
  const viewer = sessions[1].page;
  let snapshotBody;
  await until(async () => {
    const snapshot = await sessions[1].context.request.get(`${origin}/api/game-tools/draw-guess/rooms/${roomId}`);
    assert.equal(snapshot.status(), 200);
    snapshotBody = await snapshot.json();
    return snapshotBody.room.view.drawing.length === 1;
  }, 10_000);
  assert.equal(snapshotBody.room.view.answer, null);
  assert.equal(snapshotBody.room.view.drawing.length, 1);
  await host.getByText("Live ink connected").waitFor({ state: "visible", timeout: 10_000 });
  await sessions[1].context.setOffline(true);
  await viewer.waitForTimeout(700);
  await sessions[1].context.setOffline(false);
  await viewer.reload();
  await viewer.getByText("Live ink connected").waitFor({ state: "visible", timeout: 20_000 });
  const recoveredArt = viewer.locator('svg[aria-label="Artwork"] path');
  await until(async () => (await recoveredArt.count()) > 0, 8_000);
  const recoveredPath = await recoveredArt.first().getAttribute("d");
  const pathNumbers = (value) => [...value.matchAll(/-?\d+(?:\.\d+)?/g)].map((match) => Number(match[0]));
  const beforeNumbers = pathNumbers(beforeReconnect);
  const recoveredNumbers = pathNumbers(recoveredPath);
  assert.equal(recoveredNumbers.length, beforeNumbers.length);
  assert.ok(recoveredNumbers.every((value, index) => Math.abs(value - beforeNumbers[index]) < 1e-9));
  await viewer.screenshot({ path: "../../output/playwright/p2-mobile-recovered.png" });
  console.log("P2 browser: mobile viewer recovered identical draft after disconnect");
  currentStep = `${playerCount} turns, guesses, ranking and rematch`;
  async function roomSnapshot() {
    const response = await sessions[0].context.request.get(`${origin}/api/game-tools/draw-guess/rooms/${roomId}`);
    assert.equal(response.status(), 200);
    return (await response.json()).room;
  }
  async function guess(playerIndex, value, expectedCorrect) {
    const page = sessions[playerIndex].page;
    const field = page.getByRole("textbox", { name: /What is this\?/ });
    await field.waitFor({ state: "visible", timeout: 15_000 });
    await field.fill(value);
    const [response] = await Promise.all([
      page.waitForResponse((item) => item.request().method() === "POST" && item.url().endsWith(`/rooms/${roomId}/actions`)),
      page.getByRole("button", { name: "Send guess" }).click(),
    ]);
    assert.equal(response.status(), 200);
    assert.equal((await response.json()).correct, expectedCorrect);
  }
  async function finishTurn(artistIndex, word, wrongFirst = false) {
    const guessers = sessions.map((_, index) => index).filter((index) => index !== artistIndex);
    if (wrongFirst) {
      await guess(guessers[0], "definitely wrong", false);
      await sessions[guessers[0]].page.waitForTimeout(1_100);
    }
    for (const index of guessers) await guess(index, word, true);
    await until(async () => (await roomSnapshot()).view.phase === "TURN_REVEAL", 15_000);
    console.log(`P2 browser turn ${artistIndex + 1}: ${guessers.length} correct guesses, reveal visible`);
  }
  await finishTurn(0, answer, true);
  for (let artistIndex = 1; artistIndex < sessions.length; artistIndex += 1) {
    await until(async () => {
      const view = (await roomSnapshot()).view;
      return view.phase === "WORD_SELECT" && view.turnIndex === artistIndex;
    }, 20_000);
    const artist = sessions[artistIndex].page;
    const nextHeading = artist.getByRole("heading", { name: "Choose a word to draw" });
    await nextHeading.waitFor({ state: "visible", timeout: 15_000 });
    const nextWordButton = nextHeading.locator("..").getByRole("button").first();
    const nextWord = (await nextWordButton.innerText()).trim();
    await nextWordButton.click();
    await artist.getByText("Live ink connected").waitFor({ state: "visible", timeout: 20_000 });
    const nextCanvas = artist.locator('svg[aria-label="Drawing canvas"]');
    await nextCanvas.scrollIntoViewIfNeeded();
    const nextBounds = await nextCanvas.boundingBox();
    assert.ok(nextBounds);
    const nextX = nextBounds.x + nextBounds.width * 0.25;
    const nextY = nextBounds.y + nextBounds.height * 0.3;
    await artist.mouse.move(nextX, nextY);
    await artist.mouse.down();
    await artist.mouse.move(nextX + 45, nextY + 30, { steps: 5 });
    await artist.mouse.up();
    await until(async () => (await roomSnapshot()).view.drawing.length === 1, 12_000);
    await finishTurn(artistIndex, nextWord);
  }
  await until(async () => (await roomSnapshot()).view.phase === "FINISHED", 20_000);
  await host.getByRole("heading", { name: "Leaderboard" }).waitFor({ state: "visible", timeout: 15_000 });
  for (const { page } of sessions) await page.getByRole("heading", { name: "Leaderboard" }).waitFor({ state: "visible", timeout: 15_000 });
  const history = await sessions[0].context.newPage();
  await history.goto(`${origin}/en/game-tools/draw-guess/rooms/${roomId}/history`);
  await history.getByRole("heading", { name: "Past games and artwork" }).waitFor({ state: "visible", timeout: 15_000 });
  for (let turn = 1; turn <= playerCount; turn += 1) await history.getByRole("heading", { name: new RegExp(`^Turn ${turn} ·`) }).waitFor({ state: "visible" });
  assert.equal(await history.locator('svg[aria-label="Artwork"] path').count(), playerCount);
  await history.close();
  console.log(`P2 browser: ${playerCount} artists completed one turn; ranking visible to all players`);
  await host.getByRole("button", { name: "Play again" }).click();
  await until(async () => (await roomSnapshot()).view.gameNumber === 2, 15_000);
  console.log("P2 browser: rematch started game 2");
  currentStep = "deadline and old-turn isolation";
  await host.getByRole("heading", { name: "Choose a word to draw" }).waitFor({ state: "visible", timeout: 15_000 });
  await host.getByRole("heading", { name: "Choose a word to draw" }).locator("..").getByRole("button").first().click();
  await viewer.getByText("Live ink connected").waitFor({ state: "visible", timeout: 20_000 });
  assert.equal(await viewer.locator('svg[aria-label="Artwork"] path').count(), 0);
  await until(async () => {
    const view = (await roomSnapshot()).view;
    return view.gameNumber === 2 && view.phase === "TURN_REVEAL" && view.turnIndex === 0;
  }, 70_000);
  const timedOutView = (await roomSnapshot()).view;
  assert.ok(timedOutView.scores.every((score) => score === 0));
  console.log("P2 browser: game 2 expired without guesses; old game artwork did not enter new turn");
} catch (error) {
  console.error(`P2 browser failed at ${currentStep}:`, error);
  for (let index = 0; index < Math.min(sessions.length, 2); index += 1) {
    console.log(`P2 player ${index + 1} URL:`, sessions[index].page.url());
    console.log(`P2 player ${index + 1} state:`, (await sessions[index].page.locator("main").innerText().catch(() => "unavailable")).slice(0, 1_000));
  }
  for (let index = 0; index < sessions.length; index += 1) {
    await sessions[index].page.screenshot({ path: `../../output/playwright/p2-browser-failure-${index + 1}.png` }).catch(() => undefined);
  }
  process.exitCode = 1;
} finally {
  await browser?.close();
  await cleanupCreatedUsers();
  await prisma.$disconnect();
}
