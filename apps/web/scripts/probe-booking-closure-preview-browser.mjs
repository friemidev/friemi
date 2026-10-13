// Run with the preview .env and local production server on :3026.
// node --env-file=.env --import tsx scripts/probe-booking-closure-preview-browser.mjs
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { createClerkClient } from "@clerk/backend";
import { chromium } from "playwright";

const origin = "http://localhost:3026";
assert.ok(new URL(process.env.DATABASE_URL ?? "").username.includes("dryhbxognbrljslzciuh"));
assert.ok(process.env.CLERK_SECRET_KEY?.startsWith("sk_test_"));
const { prisma } = await import("../lib/prisma.ts");
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const stamp = randomUUID().replaceAll("-", "");
const output = "../../output/playwright/booking-closure-preview-acceptance";
mkdirSync(output, { recursive: true });
const formatDate = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris" });
const today = formatDate.format(new Date());
const existingDate = formatDate.format(new Date(Date.now() + 2 * 86_400_000));
const newDate = formatDate.format(new Date(Date.now() + 3 * 86_400_000));
const accounts = [];
let merchantId, activityId, settingsId, browser;
let step = "setup";

async function createAccount(role) {
  const email = `closure-${stamp}-${role}+clerk_test@example.com`;
  const password = `${randomBytes(24).toString("base64url")}Aa9!`;
  const user = await clerk.users.createUser({ emailAddress: [email], password, skipPasswordChecks: true });
  const account = { email, password, clerkUserId: user.id };
  accounts.push(account);
  const profile = await prisma.userProfile.create({ data: {
    clerkUserId: user.id, email, nickname: `Closure ${role} ${stamp.slice(0, 8)}`,
  } });
  account.profileId = profile.id;
  return account;
}

async function signIn(account) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
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

async function prepareBooking(page) {
  await page.goto(`${origin}/zh-CN/lobby/${activityId}`);
  const label = new Intl.DateTimeFormat("zh-CN", {
    weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "UTC",
  }).format(new Date(`${newDate}T12:00:00Z`));
  let dateButton = page.getByRole("button", { name: new RegExp(`^${label}`) });
  if (!(await dateButton.count())) {
    await page.getByRole("button", { name: "下个月", exact: true }).click();
    dateButton = page.getByRole("button", { name: new RegExp(`^${label}`) });
  }
  await dateButton.click();
  await page.getByRole("spinbutton", { name: "预约人数", exact: true }).fill("2");
  await page.locator("#booking-contact-name").fill("Closure Guest");
  await page.locator("#booking-contact-phone").fill("+33600001234");
}

async function checkLayout(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true);
}

try {
  const owner = await createAccount("owner");
  const guest = await createAccount("guest");
  const merchant = await prisma.merchant.create({ data: {
    slug: `closure-ui-${stamp}`, name: `Closure store ${stamp.slice(0, 8)}`,
    description: "Temporary preview closure acceptance", city: "Paris", isActive: true,
    ownerProfileId: owner.profileId,
  } });
  merchantId = merchant.id;
  const activity = await prisma.activity.create({ data: {
    title: `Closure meetup ${stamp.slice(0, 8)}`, description: "Temporary preview acceptance",
    organizerId: owner.profileId, merchantId, city: "Paris", address: "1 rue de Test",
    source: "MERCHANT_BOOKING", isPersistent: true, type: "LOCAL", category: "OTHER",
    status: "RECRUITING", visibility: "PUBLIC", capacity: 0,
    startAt: new Date(`${today}T00:00:00Z`), priceType: "FREE", priceText: "",
  } });
  activityId = activity.id;
  const settings = await prisma.merchantBookingSettings.create({ data: {
    merchantId, activityId, createdByProfileId: owner.profileId, enabled: true,
    scheduleMode: "DAILY", startDate: new Date(`${today}T00:00:00Z`),
    specificDates: [], closedDates: [],
  } });
  settingsId = settings.id;
  const reservation = await prisma.merchantBookingReservation.create({ data: {
    settingsId, profileId: guest.profileId, date: new Date(`${existingDate}T00:00:00Z`),
    partySize: 1, contactName: "Closure Guest", contactPhone: "+33600001234",
  } });
  browser = await chromium.launch({ headless: true });
  const ownerPage = await signIn(owner);
  const guestPage = await signIn(guest);
  const oldSettingsPage = await ownerPage.context().newPage();
  oldSettingsPage.setDefaultTimeout(25_000);
  await oldSettingsPage.goto(`${origin}/zh-CN/profile/store/bookings/settings`);
  await oldSettingsPage.getByLabel("接收新预约", { exact: false }).waitFor();
  assert.equal(await oldSettingsPage.getByLabel("接收新预约", { exact: false }).isChecked(), true);

  step = "close bookings with a customer form already open";
  await prepareBooking(guestPage);
  await ownerPage.goto(`${origin}/zh-CN/profile/store/bookings`);
  await ownerPage.getByRole("button", { name: "关闭预约", exact: true }).click();
  await ownerPage.getByRole("button", { name: "确认关闭", exact: true }).click();
  await ownerPage.getByRole("button", { name: "重新开启预约", exact: true }).waitFor();
  const closed = await prisma.merchantBookingSettings.findUniqueOrThrow({
    where: { id: settingsId }, include: { activity: true },
  });
  assert.equal(closed.enabled, false);
  assert.equal(closed.activity.visibility, "PRIVATE");
  await checkLayout(ownerPage);
  await ownerPage.screenshot({ path: `${output}/closed-mobile.png`, fullPage: true });
  await guestPage.getByRole("button", { name: "提交预约", exact: true }).click();
  await guestPage.getByRole("alert").waitFor();
  assert.equal(await prisma.merchantBookingReservation.count({ where: { settingsId } }), 1);

  step = "closed reservation details avoid an unavailable meetup link";
  await guestPage.goto(`${origin}/zh-CN/profile/bookings/${reservation.id}`);
  await guestPage.getByRole("heading", { name: "预约详情", exact: true }).waitFor();
  const closedSpaceLinks = await guestPage.getByRole("link", { name: "查看长期聚吧", exact: true }).count();
  console.log("Meetup links on a closed reservation:", closedSpaceLinks);
  const closedPublicPage = await guestPage.request.get(`${origin}/zh-CN/lobby/${activityId}`);
  assert.equal((await closedPublicPage.text()).includes('id="booking-contact-phone"'), false,
    "A closed store cannot expose its public booking form");

  step = "saving a stale settings form preserves the closed booking status";
  await oldSettingsPage.locator("#booking-end").fill(newDate);
  await oldSettingsPage.getByRole("button", { name: "保存设置", exact: true }).click();
  await oldSettingsPage.getByRole("status").getByText("设置已保存", { exact: true }).waitFor();
  const savedWhileClosed = await prisma.merchantBookingSettings.findUniqueOrThrow({
    where: { id: settingsId }, include: { activity: true },
  });
  assert.equal(savedWhileClosed.enabled, false, "Saving an unchanged opening switch must not reopen bookings from an old tab");
  assert.equal(savedWhileClosed.activity.visibility, "PRIVATE");
  assert.equal(savedWhileClosed.endDate.toISOString().slice(0, 10), newDate);
  assert.equal(await oldSettingsPage.getByLabel("接收新预约", { exact: false }).isChecked(), false);
  assert.equal(closedSpaceLinks, 0);
  assert.equal(await oldSettingsPage.getByRole("link", { name: "查看长期聚吧", exact: true }).count(), 0);

  step = "an explicitly changed settings switch can still reopen bookings";
  await oldSettingsPage.getByLabel("接收新预约", { exact: false }).check();
  await oldSettingsPage.getByRole("button", { name: "保存设置", exact: true }).click();
  await oldSettingsPage.getByRole("status").getByText("设置已保存", { exact: true }).waitFor();
  assert.equal((await prisma.merchantBookingSettings.findUniqueOrThrow({ where: { id: settingsId } })).enabled, true);
  await oldSettingsPage.getByRole("link", { name: "查看长期聚吧", exact: true }).waitFor();
  await ownerPage.reload();
  await ownerPage.getByRole("button", { name: "关闭预约", exact: true }).click();
  await ownerPage.getByRole("button", { name: "确认关闭", exact: true }).click();
  await ownerPage.getByRole("button", { name: "重新开启预约", exact: true }).waitFor();

  step = "process an existing reservation while closed";
  await ownerPage.goto(`${origin}/zh-CN/profile/store/bookings/reservations/${reservation.id}`);
  await ownerPage.getByRole("button", { name: "接受预约", exact: true }).click();
  await ownerPage.getByText("已接受", { exact: true }).filter({ visible: true }).first().waitFor();
  assert.equal((await prisma.merchantBookingReservation.findUniqueOrThrow({ where: { id: reservation.id } })).status, "ACCEPTED");

  step = "reopen bookings and submit a new reservation";
  await ownerPage.goto(`${origin}/zh-CN/profile/store/bookings`);
  await ownerPage.getByRole("button", { name: "重新开启预约", exact: true }).click();
  await ownerPage.getByRole("button", { name: "确认开启", exact: true }).click();
  await ownerPage.getByRole("button", { name: "关闭预约", exact: true }).waitFor();
  const reopened = await prisma.merchantBookingSettings.findUniqueOrThrow({
    where: { id: settingsId }, include: { activity: true },
  });
  assert.equal(reopened.enabled, true);
  assert.equal(reopened.activity.visibility, "PUBLIC");
  await prepareBooking(guestPage);
  await guestPage.getByRole("button", { name: "提交预约", exact: true }).click();
  await guestPage.getByRole("heading", { name: "预约已提交", exact: true }).waitFor();
  assert.equal(await prisma.merchantBookingReservation.count({ where: { settingsId } }), 2);
  await ownerPage.setViewportSize({ width: 1280, height: 900 });
  await ownerPage.reload();
  await ownerPage.getByRole("button", { name: "关闭预约", exact: true }).waitFor();
  await checkLayout(ownerPage);
  await ownerPage.screenshot({ path: `${output}/reopened-desktop.png`, fullPage: true });
  console.log("PASS booking closure: stale customer and settings forms guarded, closed public links hidden, existing reservation accepted, reopening resumes new bookings, mobile/desktop layout checked");
} catch (error) {
  console.error(`FAIL booking closure at ${step}:`, error);
  process.exitCode = 1;
} finally {
  await browser?.close();
  const ids = accounts.map((account) => account.profileId).filter(Boolean);
  if (ids.length) await prisma.notification.deleteMany({ where: { OR: [
    { actorId: { in: ids } }, { recipientId: { in: ids } },
  ] } });
  if (settingsId) {
    await prisma.merchantBookingReservation.deleteMany({ where: { settingsId } });
    await prisma.merchantBookingSettings.delete({ where: { id: settingsId } });
  }
  if (activityId) await prisma.activity.delete({ where: { id: activityId } });
  if (merchantId) await prisma.merchant.delete({ where: { id: merchantId } });
  if (ids.length) await prisma.userProfile.deleteMany({ where: { id: { in: ids } } });
  for (const account of accounts) await clerk.users.deleteUser(account.clerkUserId);
  await prisma.$disconnect();
  console.log("Preview booking closure records cleaned");
}
