// Run from apps/web with the preview .env and a local production-mode server:
// node --env-file=.env --import tsx scripts/probe-store-booking-preview-browser.mjs
// The script creates temporary Clerk accounts and preview records, then removes them.
import assert from "node:assert/strict";
import { randomBytes, randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { createClerkClient } from "@clerk/backend";
import { chromium } from "playwright";

const origin = "http://localhost:3026";
const databaseUrl = new URL(process.env.DATABASE_URL ?? "");
assert.ok(
  databaseUrl.username.includes("dryhbxognbrljslzciuh"),
  "This acceptance run is restricted to the preview database",
);
assert.ok(
  process.env.CLERK_SECRET_KEY?.startsWith("sk_test_"),
  "This acceptance run requires the Clerk test instance",
);

databaseUrl.searchParams.set("connection_limit", "10");
process.env.DATABASE_URL = databaseUrl.toString();
const { prisma } = await import("../lib/prisma.ts");
const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const stamp = randomUUID().replaceAll("-", "").slice(0, 12);
const dateFormat = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Europe/Paris",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});
const bookingDate = dateFormat.format(new Date(Date.now() + 10 * 86_400_000));
const rejectedDate = dateFormat.format(new Date(Date.now() + 11 * 86_400_000));
const title = `验收预约 ${stamp}`;
const merchantName = `验收门店 ${stamp}`;
const phone = "+33600001234";
const privateContact = `预约联系人 ${stamp}`;
const thirdDate = dateFormat.format(new Date(Date.now() + 12 * 86_400_000));
const today = dateFormat.format(new Date());
const outputDirectory =
  "../../output/playwright/store-booking-preview-acceptance";
const users = [];
const sessions = {};
let merchantId = null;
let settingsId = null;
let activityId = null;
let browser;
let step = "setup";

async function waitForDatabase(check, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await check();
    if (result) return result;
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Timed out waiting for database state at: ${step}`);
}

async function createAccount(role, index) {
  const email = `booking-${stamp}-${role}+clerk_test@example.com`;
  const password = `${randomBytes(24).toString("base64url")}Aa9!`;
  const user = await clerk.users.createUser({
    emailAddress: [email],
    firstName: "Booking",
    lastName: role,
    password,
    skipPasswordChecks: true,
  });
  const record = {
    role,
    email,
    password,
    clerkUserId: user.id,
    profileId: null,
  };
  users.push(record);
  const profile = await prisma.userProfile.create({
    data: {
      clerkUserId: user.id,
      email,
      nickname: `Booking ${role} ${stamp}`,
      role: role === "admin" ? "ADMIN" : "USER",
    },
  });
  record.profileId = profile.id;
  console.log(`Created preview ${role} account ${index + 1}/3`);
  return record;
}

async function signIn(record, viewport) {
  const context = await browser.newContext({ viewport });
  const page = await context.newPage();
  page.setDefaultTimeout(25_000);
  page.setDefaultNavigationTimeout(60_000);
  page.on("pageerror", (error) => {
    console.error(`Browser error for ${record.role}: ${error.message}`);
  });
  sessions[record.role] = { context, page };
  await page.goto(`${origin}/zh-CN/sign-in?redirect_url=%2Fzh-CN%2Fprofile`, {
    waitUntil: "domcontentloaded",
  });
  await page.getByRole("textbox", { name: "Email address" }).fill(record.email);
  await page.getByRole("button", { name: "Continue" }).click();
  await page.getByRole("textbox", { name: "Password" }).fill(record.password);
  await page.getByRole("button", { name: "Continue" }).click();
  const verification = page.getByRole("textbox", {
    name: "Enter verification code",
  });
  await verification
    .waitFor({ state: "visible", timeout: 10_000 })
    .catch(() => undefined);
  if (await verification.isVisible()) {
    await verification.fill("424242");
  }
  await page.waitForFunction(
    () => location.pathname === "/zh-CN/profile",
    undefined,
    { timeout: 45_000 },
  );
  console.log(`Signed in as ${record.role}`);
  return page;
}

function calendarLabel(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

async function openCalendarDate(page, date) {
  const label = calendarLabel(date);
  for (let attempt = 0; attempt < 24; attempt += 1) {
    const button = page.getByRole("button", { name: new RegExp(`^${label}`) });
    if (await button.count()) return button;
    await page.getByRole("button", { name: "下个月", exact: true }).click();
  }
  throw new Error(`Date not found in calendar: ${date}`);
}

async function prepareBooking(page, date, partySize = 3) {
  await page.goto(`${origin}/zh-CN/lobby/${activityId}`);
  await page.getByRole("heading", { name: title, exact: true }).waitFor();
  await page
    .getByRole("spinbutton", { name: "预约人数", exact: true })
    .fill(String(partySize));
  await (await openCalendarDate(page, date)).click();
  await page.locator("#booking-contact-name").fill(privateContact);
  await page.locator("#booking-contact-phone").fill(phone);
  await page.locator("#booking-note").fill(`私人备注 ${stamp}`);
}

async function submitPreparedBooking(page, date, guestId) {
  await page.getByRole("button", { name: "提交预约", exact: true }).click();
  await page
    .getByRole("heading", { name: "预约已提交", exact: true })
    .waitFor();
  return waitForDatabase(() =>
    prisma.merchantBookingReservation.findFirst({
      where: {
        settingsId,
        profileId: guestId,
        date: new Date(`${date}T00:00:00Z`),
        status: "PENDING",
      },
    }),
  );
}

async function assertNotice(page, recipientId, bookingId, type, titleText) {
  const notice = await waitForDatabase(() =>
    prisma.notification.findFirst({
      where: { recipientId, merchantBookingId: bookingId, type },
      select: { id: true },
    }),
  );
  await page.goto(`${origin}/zh-CN/notifications`);
  await page.getByText(titleText, { exact: true }).first().waitFor();
  const text = await page.locator("body").innerText();
  assert.equal(
    text.includes(phone),
    false,
    "Notifications must not contain phone numbers",
  );
  const noticeCard = page.locator("article").filter({
    has: page.locator(`input[name="notificationId"][value="${notice.id}"]`),
  });
  await noticeCard
    .getByRole("button", { name: "查看预约", exact: true })
    .click();
  const recipientRole = users.find(
    (user) => user.profileId === recipientId,
  )?.role;
  const expectedPath =
    recipientRole === "owner"
      ? `/zh-CN/profile/store/bookings/reservations/${bookingId}`
      : `/zh-CN/profile/bookings/${bookingId}`;
  await page.waitForURL((url) => url.pathname === expectedPath);
  await page.getByRole("heading", { name: "预约详情", exact: true }).waitFor();
  await waitForDatabase(async () =>
    Boolean(
      (
        await prisma.notification.findUnique({
          where: { id: notice.id },
          select: { readAt: true },
        })
      )?.readAt,
    ),
  );
}

async function assertNoHorizontalOverflow(page) {
  const measurements = await page.evaluate(() => ({
    width: window.innerWidth,
    content: document.documentElement.scrollWidth,
  }));
  assert.ok(
    measurements.content <= measurements.width + 1,
    `Horizontal overflow: ${JSON.stringify(measurements)}`,
  );
}

async function saveSettings(page, mutation, expected) {
  await page.goto(`${origin}/zh-CN/profile/store/bookings/settings`);
  await mutation(page);
  await page.getByRole("button", { name: "保存设置", exact: true }).click();
  await page
    .getByRole("status")
    .getByText("设置已保存", { exact: true })
    .waitFor();
  return waitForDatabase(async () => {
    const settings = await prisma.merchantBookingSettings.findUnique({
      where: { id: settingsId },
    });
    assert.equal(
      settings?.activityId,
      activityId,
      "Settings edits must reuse the same permanent meetup",
    );
    return settings && expected(settings) ? settings : null;
  });
}

async function cleanup() {
  await browser?.close();
  const profileIds = users.map((user) => user.profileId).filter(Boolean);
  const fixture = merchantId
    ? await prisma.merchant.findUnique({
        where: { id: merchantId },
        select: {
          id: true,
          slug: true,
          bookingSettings: { select: { id: true, activityId: true } },
        },
      })
    : null;
  if (fixture)
    assert.equal(
      fixture.slug,
      `booking-acceptance-${stamp}`,
      "Cleanup only owns this run's merchant",
    );
  const cleanupSettingsId = fixture?.bookingSettings?.id;
  const cleanupActivityId = fixture?.bookingSettings?.activityId;
  const reservationIds = cleanupSettingsId
    ? (
        await prisma.merchantBookingReservation.findMany({
          where: { settingsId: cleanupSettingsId },
          select: { id: true },
        })
      ).map((row) => row.id)
    : [];
  if (profileIds.length || reservationIds.length || cleanupActivityId) {
    await prisma.notification.deleteMany({
      where: {
        OR: [
          { merchantBookingId: { in: reservationIds } },
          ...(cleanupActivityId ? [{ activityId: cleanupActivityId }] : []),
          { recipientId: { in: profileIds } },
          { actorId: { in: profileIds } },
        ],
      },
    });
  }
  if (cleanupSettingsId) {
    await prisma.merchantBookingReservation.deleteMany({
      where: { settingsId: cleanupSettingsId },
    });
    await prisma.merchantBookingSettings.delete({
      where: { id: cleanupSettingsId },
    });
  }
  if (cleanupActivityId)
    await prisma.activity.delete({ where: { id: cleanupActivityId } });
  if (fixture) await prisma.merchant.delete({ where: { id: fixture.id } });
  if (profileIds.length)
    await prisma.userProfile.deleteMany({ where: { id: { in: profileIds } } });
  for (const user of users) await clerk.users.deleteUser(user.clerkUserId);
  const residue = {
    merchant: merchantId
      ? await prisma.merchant.count({ where: { id: merchantId } })
      : 0,
    profiles: await prisma.userProfile.count({
      where: { id: { in: profileIds } },
    }),
    settings: cleanupSettingsId
      ? await prisma.merchantBookingSettings.count({
          where: { id: cleanupSettingsId },
        })
      : 0,
    reservations: await prisma.merchantBookingReservation.count({
      where: { id: { in: reservationIds } },
    }),
    activities: cleanupActivityId
      ? await prisma.activity.count({ where: { id: cleanupActivityId } })
      : 0,
  };
  assert.deepEqual(residue, {
    merchant: 0,
    profiles: 0,
    settings: 0,
    reservations: 0,
    activities: 0,
  });
  await prisma.$disconnect();
  console.log("Preview acceptance fixtures cleaned:", residue);
}

try {
  const response = await fetch(`${origin}/api/health`);
  assert.equal(response.status, 200, "Local preview must be running");
  mkdirSync(outputDirectory, { recursive: true });

  step = "create three real preview accounts";
  const owner = await createAccount("owner", 0);
  const admin = await createAccount("admin", 1);
  const guest = await createAccount("guest", 2);
  const merchant = await prisma.merchant.create({
    data: {
      slug: `booking-acceptance-${stamp}`,
      name: merchantName,
      description: "临时长期聚吧预约验收，结束后删除。",
      city: "Paris",
      address: "1 rue de Test, Paris",
      isActive: true,
      ownerProfileId: owner.profileId,
    },
  });
  merchantId = merchant.id;

  browser = await chromium.launch({ headless: true });
  const publicContext = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const publicPage = await publicContext.newPage();
  publicPage.setDefaultTimeout(25_000);
  step = "confirm local app reads this run's preview merchant before UI writes";
  await publicPage.goto(`${origin}/zh-CN/merchants/${merchantId}`);
  await publicPage
    .getByRole("heading", { name: merchantName, exact: true })
    .waitFor();

  step = "sign in owner, admin and guest";
  const ownerPage = await signIn(owner, { width: 390, height: 844 });
  const adminPage = await signIn(admin, { width: 1280, height: 900 });
  const guestPage = await signIn(guest, { width: 390, height: 844 });

  step = "authorization boundaries before grant";
  await ownerPage.goto(`${origin}/zh-CN/profile/store/bookings/settings`);
  await ownerPage.getByRole("heading", { name: "预约功能尚未开通" }).waitFor();
  await guestPage.goto(
    `${origin}/zh-CN/admin/merchants/${merchantId}/bookings`,
  );
  assert.equal(
    await guestPage.getByRole("button", { name: "授予预约权限" }).count(),
    0,
  );
  assert.equal(
    (await prisma.merchant.findUniqueOrThrow({ where: { id: merchantId } }))
      .bookingAccessEnabled,
    false,
  );

  step = "admin grants booking access";
  await adminPage.goto(
    `${origin}/zh-CN/admin/merchants/${merchantId}/bookings`,
  );
  await adminPage
    .getByRole("heading", { name: merchantName, exact: true })
    .waitFor();
  await adminPage
    .getByRole("button", { name: "授予预约权限", exact: true })
    .click();
  await waitForDatabase(
    async () =>
      (await prisma.merchant.findUnique({ where: { id: merchantId } }))
        ?.bookingAccessEnabled,
  );
  await adminPage.getByText("权限已更新", { exact: true }).waitFor();
  await adminPage.screenshot({
    path: `${outputDirectory}/01-admin-access.png`,
  });
  console.log(
    "Admin granted access; owner and customer cannot grant it themselves",
  );

  step = "owner creates one permanent meetup";
  await ownerPage.goto(`${origin}/zh-CN/profile/store/bookings/settings`);
  await ownerPage.locator("#booking-title").fill(title);
  await ownerPage
    .locator("#booking-description")
    .fill(
      "长期聚吧预约验收：选日期与人数，门店确认。联系方式仅门店和本人可见。",
    );
  await ownerPage.getByText("每天", { exact: true }).click();
  await ownerPage.locator("#booking-start").fill(today);
  await ownerPage
    .getByRole("button", { name: "创建并开启预约", exact: true })
    .click();
  await ownerPage
    .getByRole("status")
    .getByText("设置已保存", { exact: true })
    .waitFor();
  const settings = await waitForDatabase(() =>
    prisma.merchantBookingSettings.findUnique({ where: { merchantId } }),
  );
  settingsId = settings.id;
  activityId = settings.activityId;
  assert.equal(settings.scheduleMode, "DAILY");
  const permanent = await prisma.activity.findUniqueOrThrow({
    where: { id: activityId },
  });
  assert.equal(permanent.isPersistent, true);
  assert.equal(permanent.source, "MERCHANT_BOOKING");
  assert.equal(permanent.status, "RECRUITING");
  assert.ok(
    permanent.startAt <= new Date(),
    "Permanent meetup start midnight has already passed",
  );
  await ownerPage.goto(`${origin}/zh-CN/profile/store/bookings`);
  await ownerPage.screenshot({
    path: `${outputDirectory}/02-owner-management.png`,
  });
  console.log(
    "Owner created one permanent meetup with ongoing daily availability",
  );

  step = "guest books date and party with required private phone";
  await prepareBooking(guestPage, bookingDate);
  await guestPage.locator("#booking-contact-phone").fill("");
  await guestPage
    .getByRole("button", { name: "提交预约", exact: true })
    .click();
  assert.equal(
    await guestPage
      .locator("#booking-contact-phone")
      .evaluate((element) => element.validity.valueMissing),
    true,
  );
  assert.equal(
    await prisma.merchantBookingReservation.count({ where: { settingsId } }),
    0,
  );
  await guestPage.locator("#booking-contact-phone").fill(phone);
  await guestPage.screenshot({
    path: `${outputDirectory}/03-guest-booking-form.png`,
    fullPage: true,
  });
  const acceptedBooking = await submitPreparedBooking(
    guestPage,
    bookingDate,
    guest.profileId,
  );
  assert.equal(acceptedBooking.partySize, 3);
  assert.equal(acceptedBooking.contactPhone, phone);
  assert.equal(acceptedBooking.contactName, privateContact);
  await assertNotice(
    ownerPage,
    owner.profileId,
    acceptedBooking.id,
    "MERCHANT_RESERVATION_REQUESTED",
    "收到新预约",
  );
  console.log(
    "Guest submitted a date and three people; mandatory phone and owner notice verified",
  );

  step = "owner sees phone and accepts; guest receives result";
  await ownerPage.goto(
    `${origin}/zh-CN/profile/store/bookings/reservations/${acceptedBooking.id}`,
  );
  await ownerPage.getByText(phone, { exact: true }).waitFor();
  assert.equal(
    await ownerPage
      .getByRole("link", { name: "联系顾客" })
      .getAttribute("href"),
    `tel:${phone}`,
  );
  await ownerPage
    .getByRole("button", { name: "接受预约", exact: true })
    .click();
  await waitForDatabase(
    async () =>
      (
        await prisma.merchantBookingReservation.findUnique({
          where: { id: acceptedBooking.id },
        })
      )?.status === "ACCEPTED",
  );
  await ownerPage.getByText("已接受", { exact: true }).first().waitFor();
  await ownerPage.screenshot({
    path: `${outputDirectory}/04-owner-accepted.png`,
    fullPage: true,
  });
  await assertNotice(
    guestPage,
    guest.profileId,
    acceptedBooking.id,
    "MERCHANT_RESERVATION_ACCEPTED",
    "门店已接受预约",
  );
  await guestPage.goto(
    `${origin}/zh-CN/profile/bookings/${acceptedBooking.id}`,
  );
  await guestPage.getByText("已接受", { exact: true }).first().waitFor();
  await guestPage.screenshot({
    path: `${outputDirectory}/05-guest-accepted.png`,
    fullPage: true,
  });

  step = "public counts and private-contact protection";
  await publicPage.goto(`${origin}/zh-CN/lobby/${activityId}`);
  await publicPage.getByRole("heading", { name: title, exact: true }).waitFor();
  const acceptedDay = await openCalendarDate(publicPage, bookingDate);
  assert.ok(
    (await acceptedDay.getAttribute("aria-label")).includes("已确认 3 人"),
  );
  await acceptedDay.click();
  await publicPage.getByText("已确认 3 人", { exact: true }).waitFor();
  const publicHtml = await publicPage.content();
  for (const privateValue of [phone, privateContact, `私人备注 ${stamp}`])
    assert.equal(
      publicHtml.includes(privateValue),
      false,
      "Public HTML/serialized props must not contain customer contact details",
    );
  const rawPublicHtml = await (
    await fetch(`${origin}/zh-CN/lobby/${activityId}`)
  ).text();
  assert.equal(rawPublicHtml.includes(phone), false);
  await publicPage.screenshot({
    path: `${outputDirectory}/06-public-desktop.png`,
    fullPage: true,
  });
  await publicPage.setViewportSize({ width: 390, height: 844 });
  await publicPage.goto(`${origin}/fr/lobby/${activityId}`);
  await publicPage
    .getByRole("heading", { name: "Sortie permanente", exact: true })
    .waitFor();
  await publicPage
    .getByRole("link", { name: "Se connecter pour réserver", exact: true })
    .waitFor();
  await assertNoHorizontalOverflow(publicPage);
  await publicPage.screenshot({
    path: `${outputDirectory}/09-public-fr-mobile.png`,
    fullPage: true,
  });
  await publicPage.setViewportSize({ width: 1280, height: 900 });
  await publicPage.goto(`${origin}/en/lobby/${activityId}`);
  await publicPage
    .getByRole("heading", { name: "Permanent meetup", exact: true })
    .waitFor();
  await publicPage
    .getByRole("link", { name: "Sign in to book", exact: true })
    .waitFor();
  await assertNoHorizontalOverflow(publicPage);
  await publicPage.screenshot({
    path: `${outputDirectory}/10-public-en-desktop.png`,
    fullPage: true,
  });
  await publicPage.goto(`${origin}/zh-CN/lobby`);
  const lobbyCard = publicPage
    .locator("[data-detail-source-target]")
    .filter({ has: publicPage.getByRole("link", { name: new RegExp(title) }) })
    .first();
  await lobbyCard.waitFor();
  const cardText = await lobbyCard.innerText();
  assert.ok(cardText.includes("长期聚吧"));
  assert.ok(cardText.includes("开放预约"));
  assert.equal(
    /已结束|已取消|0\s*\/\s*0|\d{1,2}:\d{2}/.test(cardText),
    false,
    "Permanent card must not expose stale start time or capacity",
  );
  await lobbyCard.screenshot({
    path: `${outputDirectory}/11-lobby-permanent-card.png`,
  });
  await assertNoHorizontalOverflow(publicPage);
  console.log(
    "Acceptance visible to guest; public confirmed count is three with no personal data",
  );

  step = "owner rejects a second date and guest receives reason";
  await prepareBooking(guestPage, rejectedDate, 2);
  const rejectedBooking = await submitPreparedBooking(
    guestPage,
    rejectedDate,
    guest.profileId,
  );
  await ownerPage.goto(
    `${origin}/zh-CN/profile/store/bookings/reservations/${rejectedBooking.id}`,
  );
  await ownerPage.getByText("拒绝预约", { exact: true }).click();
  await ownerPage
    .locator("#booking-reject-reason")
    .fill("验收：这一天暂时无法接待，请重新选择日期。");
  await ownerPage
    .getByRole("button", { name: "确认拒绝", exact: true })
    .click();
  await waitForDatabase(
    async () =>
      (
        await prisma.merchantBookingReservation.findUnique({
          where: { id: rejectedBooking.id },
        })
      )?.status === "REJECTED",
  );
  await assertNotice(
    guestPage,
    guest.profileId,
    rejectedBooking.id,
    "MERCHANT_RESERVATION_REJECTED",
    "门店未接受预约",
  );
  await guestPage.goto(
    `${origin}/zh-CN/profile/bookings/${rejectedBooking.id}`,
  );
  await guestPage
    .getByText("验收：这一天暂时无法接待，请重新选择日期。", { exact: true })
    .waitFor();

  step = "guest cancels accepted reservation; owner sees history";
  await guestPage.goto(
    `${origin}/zh-CN/profile/bookings/${acceptedBooking.id}`,
  );
  await guestPage.getByText("取消预约", { exact: true }).click();
  await guestPage
    .getByRole("button", { name: "确认取消", exact: true })
    .click();
  await waitForDatabase(
    async () =>
      (
        await prisma.merchantBookingReservation.findUnique({
          where: { id: acceptedBooking.id },
        })
      )?.status === "CANCELLED",
  );
  await assertNotice(
    ownerPage,
    owner.profileId,
    acceptedBooking.id,
    "MERCHANT_RESERVATION_CANCELLED",
    "预约已取消",
  );
  await ownerPage.goto(`${origin}/zh-CN/profile/store/bookings`);
  await ownerPage.getByRole("tab", { name: /历史记录/ }).click();
  await ownerPage.getByText("已取消", { exact: true }).waitFor();
  await ownerPage.getByText("未接受", { exact: true }).waitFor();
  await ownerPage.screenshot({
    path: `${outputDirectory}/07-owner-history.png`,
    fullPage: true,
  });
  console.log(
    "Second date rejection and accepted booking cancellation notify both sides; history retained",
  );

  step = "owner edits weekly and specific dates on the same meetup";
  const chosenWeekday = new Date(`${thirdDate}T12:00:00Z`).getUTCDay();
  await saveSettings(
    ownerPage,
    async (page) => {
      await page.getByText("每周", { exact: true }).click();
      for (const checkbox of await page
        .locator('input[name="weekdays"]')
        .all()) {
        const desired =
          (await checkbox.getAttribute("value")) === String(chosenWeekday);
        if ((await checkbox.isChecked()) !== desired)
          await checkbox.locator("..").click();
      }
      await page.getByText("每天", { exact: true }).click();
      await page.getByText("每周", { exact: true }).click();
      const checkedDays = await page
        .locator('input[name="weekdays"]:checked')
        .evaluateAll((elements) => elements.map((element) => element.value));
      assert.deepEqual(
        checkedDays,
        [String(chosenWeekday)],
        "Unsaved weekday choices survive mode switching",
      );
    },
    (value) =>
      value.scheduleMode === "WEEKLY" &&
      value.weekdays.length === 1 &&
      value.weekdays[0] === chosenWeekday,
  );
  await guestPage.goto(`${origin}/zh-CN/lobby/${activityId}`);
  assert.equal(
    await (await openCalendarDate(guestPage, thirdDate)).isEnabled(),
    true,
  );
  assert.equal(
    await (await openCalendarDate(guestPage, rejectedDate)).isDisabled(),
    true,
  );
  await saveSettings(
    ownerPage,
    async (page) => {
      await page.getByText("指定日期", { exact: true }).click();
      await page.getByLabel("选择开放日期", { exact: true }).fill(thirdDate);
      await page
        .getByRole("button", { name: "添加日期", exact: true })
        .first()
        .click();
      await page.getByText("每天", { exact: true }).click();
      await page.getByText("指定日期", { exact: true }).click();
      assert.equal(
        await page
          .locator(`input[name="specificDates"][value="${thirdDate}"]`)
          .count(),
        1,
        "Unsaved specific dates survive mode switching",
      );
    },
    (value) =>
      value.scheduleMode === "DATES" &&
      value.specificDates.some(
        (date) => date.toISOString().slice(0, 10) === thirdDate,
      ),
  );
  await guestPage.goto(`${origin}/zh-CN/lobby/${activityId}`);
  assert.equal(
    await (await openCalendarDate(guestPage, rejectedDate)).isDisabled(),
    true,
  );
  await prepareBooking(guestPage, thirdDate, 4);
  const preservedBooking = await submitPreparedBooking(
    guestPage,
    thirdDate,
    guest.profileId,
  );
  assert.equal(
    await prisma.activity.count({
      where: { merchantId, source: "MERCHANT_BOOKING" },
    }),
    1,
  );

  step =
    "revoke blocks new requests but owner may process an existing reservation";
  await adminPage.goto(
    `${origin}/zh-CN/admin/merchants/${merchantId}/bookings`,
  );
  await adminPage
    .getByRole("button", { name: "关闭预约权限", exact: true })
    .click();
  await waitForDatabase(
    async () =>
      !(await prisma.merchant.findUnique({ where: { id: merchantId } }))
        ?.bookingAccessEnabled,
  );
  await guestPage.goto(`${origin}/zh-CN/lobby/${activityId}`);
  await guestPage
    .getByRole("heading", { name: "已暂停新预约", exact: true })
    .waitFor();
  assert.equal(
    await guestPage
      .getByRole("button", { name: "提交预约", exact: true })
      .count(),
    0,
  );
  await ownerPage.goto(
    `${origin}/zh-CN/profile/store/bookings/reservations/${preservedBooking.id}`,
  );
  await ownerPage
    .getByRole("button", { name: "接受预约", exact: true })
    .click();
  await waitForDatabase(
    async () =>
      (
        await prisma.merchantBookingReservation.findUnique({
          where: { id: preservedBooking.id },
        })
      )?.status === "ACCEPTED",
  );
  await adminPage.goto(
    `${origin}/zh-CN/admin/merchants/${merchantId}/bookings`,
  );
  await adminPage
    .getByRole("button", { name: "授予预约权限", exact: true })
    .click();
  await waitForDatabase(
    async () =>
      (await prisma.merchant.findUnique({ where: { id: merchantId } }))
        ?.bookingAccessEnabled,
  );

  step = "pause rejects a stale customer form and preserves prior reservations";
  await saveSettings(
    ownerPage,
    async (page) => {
      await page.getByText("每天", { exact: true }).click();
    },
    (value) => value.scheduleMode === "DAILY",
  );
  await prepareBooking(guestPage, bookingDate, 1);
  await saveSettings(
    ownerPage,
    async (page) => {
      await page.getByLabel("接收新预约", { exact: false }).uncheck();
    },
    (value) => !value.enabled,
  );
  await guestPage
    .getByRole("button", { name: "提交预约", exact: true })
    .click();
  await guestPage.getByRole("alert").waitFor();
  assert.equal(
    await prisma.merchantBookingReservation.count({ where: { settingsId } }),
    3,
  );
  await guestPage.goto(`${origin}/zh-CN/lobby/${activityId}`);
  await guestPage
    .getByRole("heading", { name: "已暂停新预约", exact: true })
    .waitFor();
  await guestPage.screenshot({
    path: `${outputDirectory}/08-paused-mobile.png`,
    fullPage: true,
  });
  assert.equal(
    (
      await prisma.merchantBookingReservation.findUniqueOrThrow({
        where: { id: preservedBooking.id },
      })
    ).status,
    "ACCEPTED",
  );
  const finalActivity = await prisma.activity.findUniqueOrThrow({
    where: { id: activityId },
    include: { participants: true },
  });
  assert.equal(finalActivity.isPersistent, true);
  assert.equal(finalActivity.status, "RECRUITING");
  assert.equal(finalActivity.participants.length, 0);
  assert.ok(finalActivity.lastBookingAt);
  console.log(
    "PASS three-account permanent booking: grant, one meetup, date/party/phone, acceptance, rejection, notices, cancellation, privacy, recurring edits, revoke, pause and retained history",
  );
} catch (error) {
  console.error(`FAIL preview booking acceptance at ${step}:`, error);
  for (const [role, session] of Object.entries(sessions)) {
    await session.page
      .screenshot({
        path: `${outputDirectory}/failure-${role}.png`,
        fullPage: true,
      })
      .catch(() => undefined);
  }
  process.exitCode = 1;
} finally {
  try {
    await cleanup();
  } catch (error) {
    console.error("Preview acceptance cleanup failed:", error);
    process.exitCode = 1;
    await prisma.$disconnect().catch(() => undefined);
  }
}
