import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { createClerkClient } from "@clerk/backend";
import { createClient } from "@supabase/supabase-js";
import { chromium } from "playwright";

// Run only against the local app connected to the isolated Draw & Guess Preview services.
const origin = process.env.DRAW_GUESS_TEST_ORIGIN ?? "http://localhost:3102";
assert.ok(["localhost", "127.0.0.1"].includes(new URL(origin).hostname));
assert.ok(process.env.DATABASE_URL?.includes("dryhbxognbrljslzciuh"));
assert.ok(process.env.CLERK_SECRET_KEY?.startsWith("sk_test_"));
assert.ok(process.env.NEXT_PUBLIC_SUPABASE_URL?.includes("dryhbxognbrljslzciuh"));
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
assert.ok(publishableKey);

const { prisma } = await import("../lib/prisma.ts");
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const users = [];
const sessions = [];
let browser;
let channel;
let realtime;
let roomId;
let roomCode;
let step = "setup";

async function cleanup() {
  if (channel && realtime) await realtime.removeChannel(channel).catch(() => {});
  if (realtime) await realtime.realtime.disconnect().catch(() => {});
  await browser?.close().catch(() => {});
  if (roomId) await prisma.gameToolRoom.deleteMany({ where: { id: roomId } });
  const profileIds = users.map((user) => user.profileId).filter(Boolean);
  if (profileIds.length) await prisma.userProfile.deleteMany({ where: { id: { in: profileIds } } });
  for (const user of users) await clerk.users.deleteUser(user.userId);
  await prisma.$disconnect();
  console.log(`Cleaned up ${roomId ? 1 : 0} test room, ${profileIds.length} profiles, ${users.length} Clerk users`);
}

async function request(seat, method, path, data) {
  const response = await sessions[seat].context.request.fetch(`${origin}${path}`, {
    method,
    ...(data === undefined ? {} : { data }),
  });
  const body = await response.json().catch(() => ({}));
  assert.ok(response.ok(), `${method} ${path}: HTTP ${response.status()} ${body.error ?? ""}`);
  assert.ok(!body.error, `${method} ${path}: ${body.error}`);
  return body;
}

async function snapshot(seat = 0) {
  return (await request(seat, "GET", `/api/game-tools/draw-guess/rooms/${roomId}`)).room;
}

async function action(seat, payload) {
  const room = await snapshot(seat);
  return request(seat, "POST", `/api/game-tools/draw-guess/rooms/${roomId}/actions`, {
    commandId: randomUUID(),
    expectedChainStage: room.view.chainStage,
    expectedPhase: room.view.phase,
    expectedTurnIndex: room.view.turnIndex,
    gameNumber: room.view.gameNumber,
    action: payload,
  });
}

async function expirePhase(expectedPhase) {
  const stored = await prisma.gameToolRoom.findUniqueOrThrow({ where: { id: roomId } });
  assert.equal(stored.state.phase, expectedPhase);
  const expired = new Date(Date.now() - 1_000);
  await prisma.gameToolRoom.update({
    where: { id: roomId },
    data: {
      drawGuessDeadlineAt: expired,
      revision: { increment: 1 },
      state: { ...stored.state, deadlineAt: expired.toISOString() },
    },
  });
  return snapshot(); // Authenticated GET exercises the same deadline transition as the scanner.
}

const stroke = [{ color: "#30425C", width: 5, points: [[0.2, 0.25], [0.5, 0.75], [0.8, 0.25]] }];

try {
  const stamp = randomUUID().replaceAll("-", "").slice(0, 12);
  for (let seat = 0; seat < 2; seat += 1) {
    const email = `relay-closure-${stamp}-${seat}+clerk_test@example.com`;
    const password = `${randomBytes(24).toString("base64url")}Aa9!`;
    const user = await clerk.users.createUser({ emailAddress: [email], firstName: "Relay", lastName: String(seat + 1), password, skipPasswordChecks: true });
    const record = { email, password, userId: user.id, profileId: null };
    users.push(record);
    const profile = await prisma.userProfile.create({ data: { clerkUserId: user.id, nickname: `Relay closure ${seat + 1}` } });
    record.profileId = profile.id;
  }

  browser = await chromium.launch({ headless: true });
  for (let seat = 0; seat < 2; seat += 1) {
    step = `sign in seat ${seat}`;
    const context = await browser.newContext({ viewport: seat ? { width: 390, height: 844 } : { width: 1280, height: 900 } });
    const page = await context.newPage();
    sessions.push({ context, page });
    await page.goto(`${origin}/en/sign-in?redirect_url=%2Fen%2Fgame-tools%2Fdraw-guess`, { waitUntil: "domcontentloaded" });
    await page.getByRole("textbox", { name: "Email address" }).fill(users[seat].email);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.getByRole("textbox", { name: "Password" }).fill(users[seat].password);
    await page.getByRole("button", { name: "Continue" }).click();
    const verification = page.getByRole("textbox", { name: "Enter verification code" });
    await verification.waitFor({ state: "visible", timeout: 10_000 }).catch(() => undefined);
    if (await verification.isVisible()) await verification.fill("424242");
    await page.waitForURL((url) => !url.pathname.includes("sign-in"), { timeout: 30_000 });
  }

  step = "create, join, and start";
  const created = await request(0, "POST", "/api/game-tools/draw-guess/rooms", { locale: "en", mode: "CHAIN", playerCount: 2, roundCount: 1 });
  roomId = created.room.id;
  roomCode = created.room.code;
  await request(1, "POST", "/api/game-tools/draw-guess/join", { code: roomCode });
  for (const seat of [0, 1]) {
    await sessions[seat].page.goto(`${origin}/en/game-tools/draw-guess/rooms/${roomId}`);
    await request(seat, "POST", `/api/game-tools/draw-guess/rooms/${roomId}/ready`, { ready: true });
  }
  assert.equal((await snapshot()).canStart, true);

  realtime = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, publishableKey, {
    auth: { autoRefreshToken: false, detectSessionInUrl: false, persistSession: false },
  });
  let eventResolve;
  const eventReceived = new Promise((resolve) => { eventResolve = resolve; });
  const subscribed = new Promise((resolve, reject) => {
    channel = realtime.channel(`friemi:draw-guess:${roomId}`)
      .on("broadcast", { event: "room-changed" }, () => eventResolve(true))
      .subscribe((status) => status === "SUBSCRIBED" ? resolve(true) : status === "CHANNEL_ERROR" ? reject(new Error("Realtime subscription failed")) : undefined);
  });
  await Promise.race([subscribed, new Promise((_, reject) => setTimeout(() => reject(new Error("Realtime subscribe timeout")), 12_000))]);
  await request(0, "POST", `/api/game-tools/draw-guess/rooms/${roomId}/actions`, { action: { type: "START" } });
  await Promise.race([eventReceived, new Promise((_, reject) => setTimeout(() => reject(new Error("Realtime room event timeout")), 12_000))]);
  assert.equal((await snapshot()).view.phase, "CHAIN_WORD");
  await sessions[0].page.getByRole("heading", { name: "Choose a starting word from this pack" }).waitFor({ timeout: 20_000 });
  await sessions[1].page.getByRole("heading", { name: "Choose a starting word from this pack" }).waitFor({ timeout: 20_000 });
  console.log("PASS two Clerk browsers and Supabase room broadcast");

  step = "submit opening words and simulate a disconnect";
  for (const seat of [0, 1]) {
    const room = await snapshot(seat);
    assert.ok(room.view.task.options?.length);
    await action(seat, { type: "SUBMIT_STEP", value: room.view.task.options[0] });
  }
  assert.equal((await snapshot()).view.phase, "CHAIN_STEP");
  await sessions[1].page.close();
  await request(1, "POST", `/api/game-tools/draw-guess/rooms/${roomId}/depart`);
  await new Promise((resolve) => setTimeout(resolve, 9_000));
  assert.equal((await snapshot()).seats[1].managed, true);
  await request(1, "POST", "/api/game-tools/draw-guess/join", { code: roomCode });
  sessions[1].page = await sessions[1].context.newPage();
  await sessions[1].page.goto(`${origin}/en/game-tools/draw-guess/rooms/${roomId}`);
  assert.equal((await snapshot()).seats[1].managed, false);
  assert.equal((await snapshot(1)).viewerSeat, 1);
  console.log("PASS disconnect management and same-seat reconnect");

  step = "deadline saves unsubmitted drafts";
  await action(0, { type: "SAVE_DRAFT", strokes: stroke });
  const drawingStage = await expirePhase("CHAIN_STEP");
  assert.equal(drawingStage.view.phase, "CHAIN_STEP");
  assert.equal(drawingStage.view.chainStage, 2);
  assert.equal(drawingStage.view.chains, undefined); // No early reveal to players.
  const storedDrawing = await prisma.gameToolRoom.findUniqueOrThrow({ where: { id: roomId } });
  assert.equal(storedDrawing.state.chains[0][1].system, true); // This step was auto-filled while its player was away.
  assert.equal(storedDrawing.state.chains[2][1].system, false);
  console.log("PASS drawing timeout retains the active player's draft and skips the absent player");

  step = "finish guesses and vote on matching words";
  for (const seat of [0, 1]) await action(seat, { type: "SUBMIT_STEP", value: `guess ${seat}` });
  assert.equal((await snapshot()).view.phase, "MATCH_VOTE");
  for (let owner = 0; owner < 3; owner += 1) {
    for (const seat of [0, 1]) await action(seat, { type: "VOTE", owner, value: true });
  }
  let room = await snapshot();
  assert.equal(room.view.phase, "MATCH_RESULT");
  assert.deepEqual(room.view.voteCounts, Array.from({ length: 3 }, () => ({ yes: 2, no: 0, abstain: 0 })));
  room = await expirePhase("MATCH_RESULT");
  assert.equal(room.view.phase, "ARTWORK_VOTE");
  for (const seat of [0, 1]) await action(seat, { type: "VOTE_ARTWORK", owner: 2, step: 1 });
  room = await snapshot();
  assert.equal(room.view.phase, "ARTWORK_RESULT");
  assert.equal(room.view.picks["2"], 1);
  assert.deepEqual(room.view.artworkVoterSeats, [0, 1]);
  assert.deepEqual(room.view.artworkVotes["2"], { "0": 1, "1": 1 });
  await sessions[0].page.getByRole("region", { name: "Winning drawing!" }).waitFor({ timeout: 20_000 });
  await sessions[1].page.getByRole("region", { name: "Winning drawing!" }).waitFor({ timeout: 20_000 });
  console.log("PASS both browsers reveal the same winning drawing and voters");

  step = "deadline closes result without double-scoring";
  const scores = [...room.view.scores];
  room = await expirePhase("ARTWORK_RESULT");
  assert.equal(room.view.phase, "FINISHED");
  assert.deepEqual(room.view.scores, scores);
  await sessions[0].page.getByRole("heading", { name: "Leaderboard" }).waitFor({ timeout: 20_000 });
  await sessions[1].page.getByRole("heading", { name: "Leaderboard" }).waitFor({ timeout: 20_000 });
  console.log("PASS relay result, leaderboard, and frozen scores");
} catch (error) {
  console.error(`FAIL local Preview relay closure at ${step}:`, error);
  throw error;
} finally {
  await cleanup();
}
