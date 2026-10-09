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
const rejectedTitle = `验收拒绝 ${stamp}`;
const merchantName = `验收门店 ${stamp}`;
const meetingAddress = `验收地点 ${stamp}，巴黎`;
const outputDirectory =
  "../../output/playwright/store-booking-preview-acceptance";
const users = [];
const sessions = {};
let merchantId = null;
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

async function requestDate(page, date, requestTitle) {
  await page.goto(`${origin}/zh-CN/profile/store/bookings/new`);
  await page.getByLabel("预约日期").fill(date);
  await page.getByLabel("公开标题").fill(requestTitle);
  await page
    .getByLabel("公开介绍")
    .fill("临时验收记录：商家申请日期，管理员审核，用户报名后生成聚吧。");
  await page.getByRole("button", { name: "提交审核" }).click();
  await page.getByRole("status").getByText("已提交").waitFor();
  return waitForDatabase(() =>
    prisma.merchantResidencySlot.findFirst({
      where: { merchantId, title: requestTitle },
      select: { id: true, status: true },
    }),
  );
}

async function cleanup() {
  await browser?.close();
  const slotRows = merchantId
    ? await prisma.merchantResidencySlot.findMany({
        where: { merchantId },
        select: { id: true, activityId: true },
      })
    : [];
  const slotIds = slotRows.map((slot) => slot.id);
  const activityIds = slotRows.map((slot) => slot.activityId).filter(Boolean);
  const profileIds = users.map((user) => user.profileId).filter(Boolean);

  if (slotIds.length || activityIds.length || profileIds.length) {
    await prisma.notification.deleteMany({
      where: {
        OR: [
          { residencySlotId: { in: slotIds } },
          { activityId: { in: activityIds } },
          { recipientId: { in: profileIds } },
          { actorId: { in: profileIds } },
        ],
      },
    });
  }
  if (slotIds.length) {
    await prisma.merchantResidencySignup.deleteMany({
      where: { slotId: { in: slotIds } },
    });
    await prisma.merchantResidencySlot.deleteMany({
      where: { id: { in: slotIds } },
    });
  }
  if (activityIds.length) {
    await prisma.activity.deleteMany({
      where: { id: { in: activityIds } },
    });
  }
  if (merchantId) {
    await prisma.merchant.deleteMany({ where: { id: merchantId } });
  }
  if (profileIds.length) {
    await prisma.userProfile.deleteMany({
      where: { id: { in: profileIds } },
    });
  }
  for (const user of users) {
    await clerk.users.deleteUser(user.clerkUserId);
  }
  const residue = {
    merchant: merchantId
      ? await prisma.merchant.count({ where: { id: merchantId } })
      : 0,
    profiles: await prisma.userProfile.count({
      where: { id: { in: profileIds } },
    }),
    slots: await prisma.merchantResidencySlot.count({
      where: { id: { in: slotIds } },
    }),
    activities: await prisma.activity.count({
      where: { id: { in: activityIds } },
    }),
  };
  assert.deepEqual(residue, {
    merchant: 0,
    profiles: 0,
    slots: 0,
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
      description: "临时店铺预约浏览器验收，结束后删除。",
      city: "Paris",
      address: "1 rue de Test, Paris",
      isActive: true,
      ownerProfileId: owner.profileId,
    },
  });
  merchantId = merchant.id;

  browser = await chromium.launch({ headless: true });
  step = "confirm local app reads the same preview database";
  const publicPage = await browser.newPage();
  try {
    await publicPage.goto(`${origin}/zh-CN/merchants/${merchantId}/bookings`);
    await publicPage
      .getByRole("heading", { name: new RegExp(merchantName) })
      .waitFor();
  } finally {
    await publicPage.close();
  }

  step = "sign in owner, admin and guest";
  const ownerPage = await signIn(owner, { width: 390, height: 844 });
  const adminPage = await signIn(admin, { width: 1280, height: 900 });
  const guestPage = await signIn(guest, { width: 390, height: 844 });

  step = "owner submits booking date";
  const requested = await requestDate(ownerPage, bookingDate, title);
  assert.equal(requested.status, "PENDING");
  const slotId = requested.id;
  console.log("Owner submitted a pending date through the UI");
  await ownerPage.screenshot({
    path: `${outputDirectory}/01-owner-request.png`,
  });

  step = "admin reviews and confirms";
  await adminPage.goto(`${origin}/zh-CN/admin/merchants/bookings`);
  await adminPage.getByRole("link", { name: new RegExp(title) }).click();
  await adminPage.getByRole("button", { name: "确认这个日期" }).click();
  await waitForDatabase(async () => {
    const slot = await prisma.merchantResidencySlot.findUnique({
      where: { id: slotId },
      select: { status: true, reviewedByProfileId: true },
    });
    return (
      slot?.status === "CONFIRMED" &&
      slot.reviewedByProfileId === admin.profileId
    );
  });
  await waitForDatabase(() =>
    prisma.notification.findFirst({
      where: {
        residencySlotId: slotId,
        recipientId: owner.profileId,
        type: "MERCHANT_BOOKING_CONFIRMED",
      },
      select: { id: true },
    }),
  );
  await ownerPage.goto(`${origin}/zh-CN/notifications`);
  await ownerPage.getByText(title, { exact: false }).first().waitFor();
  console.log("Admin confirmed the date; owner received a notification");
  await adminPage.screenshot({
    path: `${outputDirectory}/02-admin-confirmed.png`,
  });

  step = "guest signs up from public calendar";
  await guestPage.goto(
    `${origin}/zh-CN/merchants/${merchantId}/bookings?month=${bookingDate.slice(0, 7)}`,
  );
  await guestPage.getByRole("link", { name: `查看日期详情：${title}` }).click();
  await guestPage.getByRole("button", { name: "我要报名" }).click();
  const signup = await waitForDatabase(() =>
    prisma.merchantResidencySignup.findFirst({
      where: { slotId, profileId: guest.profileId, status: "ACTIVE" },
      select: { id: true },
    }),
  );
  await guestPage.getByText("1 人已报名").waitFor();
  await guestPage.goto(`${origin}/zh-CN/profile/bookings`);
  await guestPage.getByText(title).waitFor();
  console.log("Guest signed up; public count and personal list updated");
  await guestPage.screenshot({
    path: `${outputDirectory}/03-guest-bookings.png`,
  });

  step = "guest cancels and resumes signup";
  await guestPage.goto(
    `${origin}/zh-CN/merchants/${merchantId}/bookings/${slotId}`,
  );
  await guestPage.getByRole("button", { name: "取消报名" }).click();
  await waitForDatabase(async () => {
    const row = await prisma.merchantResidencySignup.findUnique({
      where: { id: signup.id },
      select: { status: true },
    });
    return row?.status === "CANCELLED";
  });
  await guestPage.getByRole("button", { name: "我要报名" }).click();
  await waitForDatabase(async () => {
    const row = await prisma.merchantResidencySignup.findUnique({
      where: { id: signup.id },
      select: { status: true },
    });
    return row?.status === "ACTIVE";
  });
  assert.equal(
    await prisma.merchantResidencySignup.count({
      where: { slotId, profileId: guest.profileId },
    }),
    1,
  );
  console.log("Guest cancelled and resumed the same signup row");

  step = "owner publishes a meetup";
  await ownerPage.goto(`${origin}/zh-CN/profile/store/bookings/${slotId}`);
  const guestProfile = await prisma.userProfile.findUniqueOrThrow({
    where: { id: guest.profileId },
    select: { nickname: true },
  });
  await ownerPage.waitForFunction(
    (nickname) => document.body.innerText.includes(nickname),
    guestProfile.nickname,
  );
  await ownerPage.getByRole("link", { name: "生成聚吧" }).click();
  await ownerPage.getByLabel("开始时间").fill("19:30");
  await ownerPage.getByLabel("聚吧地点").fill(meetingAddress);
  await ownerPage.getByRole("button", { name: "确认生成聚吧" }).click();
  const published = await waitForDatabase(async () => {
    const slot = await prisma.merchantResidencySlot.findUnique({
      where: { id: slotId },
      select: { status: true, activityId: true },
    });
    return slot?.status === "PUBLISHED" && slot.activityId ? slot : null;
  });
  const activity = await prisma.activity.findUniqueOrThrow({
    where: { id: published.activityId },
    select: {
      source: true,
      status: true,
      merchantId: true,
      address: true,
      participants: {
        select: { userProfileId: true, status: true },
      },
    },
  });
  assert.equal(activity.source, "MERCHANT_RESIDENCY");
  assert.equal(activity.status, "RECRUITING");
  assert.equal(activity.merchantId, merchantId);
  assert.equal(activity.address, meetingAddress);
  assert.deepEqual(
    activity.participants
      .map((participant) => [participant.userProfileId, participant.status])
      .sort((a, b) => a[0].localeCompare(b[0])),
    [
      [owner.profileId, "APPROVED"],
      [guest.profileId, "APPROVED"],
    ].sort((a, b) => a[0].localeCompare(b[0])),
  );
  await waitForDatabase(() =>
    prisma.notification.findFirst({
      where: {
        residencySlotId: slotId,
        recipientId: guest.profileId,
        type: "MERCHANT_BOOKING_PUBLISHED",
      },
      select: { id: true },
    }),
  );
  await guestPage.goto(`${origin}/zh-CN/notifications`);
  await guestPage.getByText(title, { exact: false }).first().waitFor();
  await guestPage.goto(
    `${origin}/zh-CN/merchants/${merchantId}/bookings/${slotId}`,
  );
  await guestPage.getByRole("link", { name: "进入聚吧" }).waitFor();
  const bookingDetail = await guestPage.locator("main").first().innerText();
  assert.ok(bookingDetail.includes(meetingAddress));
  assert.ok(bookingDetail.includes("19:30"));
  console.log("Meetup published; guest was transferred and notified");
  await guestPage.screenshot({
    path: `${outputDirectory}/04-guest-published.png`,
  });

  step = "admin cancels published meetup and booking";
  await adminPage.goto(`${origin}/zh-CN/admin/merchants/bookings/${slotId}`);
  await adminPage.getByText("取消聚吧与预约").click();
  await adminPage.getByRole("button", { name: "确认取消聚吧" }).click();
  await waitForDatabase(async () => {
    const [slot, currentActivity, currentSignup] = await Promise.all([
      prisma.merchantResidencySlot.findUnique({
        where: { id: slotId },
        select: { status: true },
      }),
      prisma.activity.findUnique({
        where: { id: published.activityId },
        select: { status: true },
      }),
      prisma.merchantResidencySignup.findUnique({
        where: { id: signup.id },
        select: { status: true },
      }),
    ]);
    return (
      slot?.status === "CANCELLED" &&
      currentActivity?.status === "CANCELLED" &&
      currentSignup?.status === "CANCELLED"
    );
  });
  await waitForDatabase(() =>
    prisma.notification.findFirst({
      where: {
        activityId: published.activityId,
        recipientId: guest.profileId,
        type: "ACTIVITY_CANCELLED",
      },
      select: { id: true },
    }),
  );
  await guestPage.goto(`${origin}/zh-CN/profile/bookings`);
  await guestPage.waitForFunction(
    (expectedTitle) =>
      document.body.innerText.includes(expectedTitle) &&
      document.body.innerText.includes("已关闭"),
    title,
  );
  console.log(
    "Admin cancelled meetup; booking, signup and guest history agree",
  );
  await guestPage.screenshot({
    path: `${outputDirectory}/05-guest-closed.png`,
  });

  step = "admin rejects a separate request";
  const rejectedRequest = await requestDate(
    ownerPage,
    rejectedDate,
    rejectedTitle,
  );
  assert.equal(rejectedRequest.status, "PENDING");
  await adminPage.goto(
    `${origin}/zh-CN/admin/merchants/bookings/${rejectedRequest.id}`,
  );
  await adminPage.getByLabel("拒绝原因").fill("验收测试：本次日期不合适。");
  await adminPage.getByRole("button", { name: "拒绝这个日期" }).click();
  await waitForDatabase(async () => {
    const slot = await prisma.merchantResidencySlot.findUnique({
      where: { id: rejectedRequest.id },
      select: { status: true, rejectionReason: true },
    });
    return slot?.status === "REJECTED" && Boolean(slot.rejectionReason);
  });
  await waitForDatabase(() =>
    prisma.notification.findFirst({
      where: {
        residencySlotId: rejectedRequest.id,
        recipientId: owner.profileId,
        type: "MERCHANT_BOOKING_REJECTED",
      },
      select: { id: true },
    }),
  );
  await ownerPage.goto(
    `${origin}/zh-CN/profile/store/bookings/${rejectedRequest.id}`,
  );
  await ownerPage.waitForFunction(() =>
    document.body.innerText.includes("验收测试：本次日期不合适。"),
  );
  assert.ok(
    (await ownerPage.locator("main").first().innerText()).includes(
      "重新申请这个日期",
    ),
  );
  console.log(
    "Admin rejected a second date; owner saw the reason and retry path",
  );

  console.log(
    "PASS real three-account preview booking flow: request, review, signup, cancel and resume, publish, notification, cancellation, history, rejection",
  );
} catch (error) {
  console.error(`FAIL preview booking acceptance at ${step}:`, error);
  for (const [role, session] of Object.entries(sessions)) {
    await session.page
      .screenshot({ path: `${outputDirectory}/failure-${role}.png` })
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
