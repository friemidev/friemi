// Run against the preview database and Clerk test instance with the local server on :3026.
// node --env-file=.env --import tsx scripts/probe-archive-ui-preview-browser.mjs
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { createClerkClient } from "@clerk/backend";
import { chromium } from "playwright";

const origin = "http://localhost:3026";
const dbUrl = new URL(process.env.DATABASE_URL ?? "");
assert.ok(dbUrl.username.includes("dryhbxognbrljslzciuh"));
assert.ok(process.env.CLERK_SECRET_KEY?.startsWith("sk_test_"));
const { prisma } = await import("../lib/prisma.ts");
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const stamp = randomUUID().replaceAll("-", "");
const output = "../../output/playwright/archive-preview-acceptance";
mkdirSync(output, { recursive: true });
const accounts = [];
let merchantId;
let couponId;
let definitionId;
let browser;
let step = "setup";

async function createAccount(role) {
  const email = `archive-${stamp}-${role}+clerk_test@example.com`;
  const password = `${randomBytes(24).toString("base64url")}Aa9!`;
  const user = await clerk.users.createUser({
    emailAddress: [email],
    firstName: "Archive",
    lastName: role,
    password,
    skipPasswordChecks: true,
  });
  const account = { role, email, password, clerkUserId: user.id };
  accounts.push(account);
  const profile = await prisma.userProfile.create({
    data: {
      clerkUserId: user.id,
      email,
      nickname: `Archive ${role} ${stamp.slice(0, 8)}`,
      role: role === "admin" ? "ADMIN" : "USER",
    },
  });
  account.profileId = profile.id;
  return account;
}

async function signIn(account, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.setDefaultTimeout(25_000);
  await page.goto(`${origin}/zh-CN/sign-in?redirect_url=%2Fzh-CN%2Fprofile`);
  await page.getByRole("textbox", { name: "Email address" }).fill(account.email);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("textbox", { name: "Password" }).fill(account.password);
  await page.getByRole("button", { name: "Continue" }).click();
  const verification = page.getByRole("textbox", { name: "Enter verification code" });
  await verification.waitFor({ state: "visible", timeout: 10_000 }).catch(() => undefined);
  if (await verification.isVisible()) await verification.fill("424242");
  await page.waitForURL((url) => url.pathname === "/zh-CN/profile", { timeout: 45_000 });
  return page;
}

async function checkLayout(page) {
  const { width, content } = await page.evaluate(() => ({
    width: innerWidth,
    content: document.documentElement.scrollWidth,
  }));
  assert.ok(content <= width + 1, `Horizontal overflow: ${content} > ${width}`);
}

try {
  step = "create temporary accounts and records";
  const owner = await createAccount("owner");
  const admin = await createAccount("admin");
  const merchant = await prisma.merchant.create({
    data: {
      slug: `archive-ui-${stamp}`,
      name: `Archive UI ${stamp.slice(0, 8)}`,
      description: "Temporary UI acceptance store",
      city: "Paris",
      isActive: true,
      ownerProfileId: owner.profileId,
    },
  });
  merchantId = merchant.id;
  const coupon = await prisma.coupon.create({
    data: {
      merchantId,
      title: `Archive coupon ${stamp.slice(0, 8)}`,
      description: "Temporary preview acceptance coupon",
      claimToken: stamp,
      expiresAt: new Date("2050-01-01T00:00:00Z"),
      quantityLimit: 10,
    },
  });
  couponId = coupon.id;
  const ticket = await prisma.inventoryItemDefinition.create({
    data: {
      title: `Archive ticket ${stamp.slice(0, 8)}`,
      kind: "EVENT_TICKET",
      totalSupply: 10,
      createdByProfileId: admin.profileId,
      merchantId,
    },
  });
  definitionId = ticket.id;
  browser = await chromium.launch({ headless: true });
  const ownerPage = await signIn(owner, { width: 390, height: 844 });
  const adminPage = await signIn(admin, { width: 1280, height: 900 });

  step = "merchant archives coupon on mobile";
  await ownerPage.goto(`${origin}/zh-CN/profile/store/coupons/${couponId}`);
  await ownerPage.getByRole("heading", { name: coupon.title }).waitFor();
  await ownerPage.getByRole("button", { name: "归档优惠券" }).click();
  await ownerPage.getByRole("button", { name: "确认归档" }).click();
  await ownerPage.getByText("已归档", { exact: true }).first().waitFor();
  assert.ok((await prisma.coupon.findUniqueOrThrow({ where: { id: couponId } })).archivedAt);
  await ownerPage.goto(`${origin}/zh-CN/profile/store/coupons`);
  assert.equal(await ownerPage.getByText(coupon.title, { exact: true }).count(), 0);
  await ownerPage.goto(`${origin}/zh-CN/profile/store/coupons?filter=archived`);
  await ownerPage.getByText(coupon.title, { exact: true }).filter({ visible: true }).first().waitFor();
  const archiveFilter = await ownerPage.getByRole("button", { name: /^已归档/ }).filter({ visible: true }).first().boundingBox();
  assert.ok(archiveFilter && archiveFilter.x >= 0 && archiveFilter.x + archiveFilter.width <= 390,
    "The archived filter must be visible without horizontal scrolling on mobile");
  await checkLayout(ownerPage);
  await ownerPage.screenshot({ path: `${output}/coupon-archived-mobile.png`, fullPage: true });

  step = "administrator archives ticket on desktop";
  await adminPage.goto(`${origin}/zh-CN/admin/items/${definitionId}/settings`);
  await adminPage.getByRole("button", { name: "归档票券" }).click();
  await adminPage.getByRole("button", { name: "确认归档" }).click();
  await adminPage.getByRole("status").getByText("票券已归档。", { exact: true }).waitFor();
  assert.ok((await prisma.inventoryItemDefinition.findUniqueOrThrow({ where: { id: definitionId } })).archivedAt);
  await adminPage.goto(`${origin}/zh-CN/admin/merchants?view=items`);
  assert.equal(await adminPage.getByText(ticket.title, { exact: true }).count(), 0);
  await adminPage.goto(`${origin}/zh-CN/admin/merchants?view=items&archived=1`);
  await adminPage.getByText(ticket.title, { exact: true }).filter({ visible: true }).first().waitFor();
  await checkLayout(adminPage);
  await adminPage.screenshot({ path: `${output}/ticket-archived-desktop.png`, fullPage: true });
  await adminPage.setViewportSize({ width: 390, height: 844 });
  await checkLayout(adminPage);
  await adminPage.screenshot({ path: `${output}/ticket-archived-mobile.png`, fullPage: true });
  console.log("PASS archive UI: merchant mobile and administrator desktop/mobile filters and controls");
} catch (error) {
  console.error(`FAIL archive UI acceptance at ${step}:`, error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  if (definitionId)
    await prisma.inventoryItemDefinition.delete({ where: { id: definitionId } });
  if (couponId) await prisma.coupon.delete({ where: { id: couponId } });
  if (merchantId) await prisma.merchant.delete({ where: { id: merchantId } });
  const ids = accounts.map((account) => account.profileId).filter(Boolean);
  if (ids.length)
    await prisma.userProfile.deleteMany({ where: { id: { in: ids } } });
  for (const account of accounts)
    await clerk.users.deleteUser(account.clerkUserId);
  await prisma.$disconnect();
  console.log("Preview archive UI records cleaned");
}
