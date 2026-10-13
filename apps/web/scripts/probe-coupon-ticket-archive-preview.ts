// Run only against the preview database: node --env-file=.env --import tsx scripts/probe-coupon-ticket-archive-preview.ts
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { prisma } from "../lib/prisma";
import {
  getCouponClaimAvailability,
  isCouponWalletItemUsable,
} from "../features/coupons/couponRules";
import {
  claimCouponByToken,
  generateCouponRedemptionToken,
  getCouponRedemptionPreview,
  setCouponCampaignArchived,
} from "../features/coupons/services/couponService";
import {
  issueTicketBatch,
  setTicketDefinitionArchived,
} from "../features/inventory/services/inventoryService";
import {
  generateTicketTokenInTransaction,
  redeemTicketInTransaction,
} from "../features/inventory/services/ticketRedemptionService";

const databaseUrl = new URL(process.env.DATABASE_URL ?? "");
assert.ok(
  databaseUrl.username.includes("dryhbxognbrljslzciuh"),
  "This probe only runs against the preview database",
);

const stamp = randomUUID().replaceAll("-", "");
const code = (index: number) =>
  String((Number.parseInt(stamp.slice(index, index + 6), 16) + index) % 1_000_000)
    .padStart(6, "0");
const profileIds: string[] = [];
let merchantId: string | null = null;
let couponId: string | null = null;
let definitionId: string | null = null;
const locker = new PrismaClient();
let pendingClaim: ReturnType<typeof claimCouponByToken> | undefined;

try {
  const profiles = [];
  for (const [index, role] of ["owner", "admin", "first", "second"].entries()) {
      const profile = await prisma.userProfile.create({
        data: {
          clerkUserId: `archive-probe-${stamp}-${role}`,
          friendCode: code(index * 6),
          nickname: `Archive probe ${role}`,
          role: role === "admin" ? "ADMIN" : "USER",
        },
      });
      profileIds.push(profile.id);
      profiles.push(profile);
  }
  const [owner, admin, firstGuest, secondGuest] = profiles;
  const merchant = await prisma.merchant.create({
    data: {
      slug: `archive-probe-${stamp}`,
      name: `Archive probe ${stamp}`,
      description: "Temporary preview acceptance record",
      city: "Paris",
      isActive: true,
      ownerProfileId: owner.id,
    },
  });
  merchantId = merchant.id;
  const coupon = await prisma.coupon.create({
    data: {
      merchantId,
      title: "Archive probe coupon",
      description: "Temporary preview acceptance record",
      claimToken: stamp,
      expiresAt: new Date("2050-01-01T00:00:00Z"),
      quantityLimit: 2,
    },
  });
  couponId = coupon.id;
  const definition = await prisma.inventoryItemDefinition.create({
    data: {
      title: "Archive probe ticket",
      kind: "EVENT_TICKET",
      totalSupply: 2,
      isGiftable: true,
      createdByProfileId: admin.id,
      merchantId,
    },
  });
  definitionId = definition.id;

  await prisma.couponWalletItem.create({
    data: { couponId, ownerProfileId: firstGuest.id },
  });
  const batch = await prisma.inventoryIssueBatch.create({
    data: {
      actorProfileId: admin.id,
      definitionId,
      quantity: 1,
      recipientProfileId: firstGuest.id,
      requestId: randomUUID(),
    },
  });
  await prisma.inventoryItem.create({
    data: {
      definitionId,
      ownerProfileId: firstGuest.id,
      issueBatchId: batch.id,
      serialNumber: 1,
    },
  });
  await prisma.inventoryItemDefinition.update({
    where: { id: definitionId },
    data: { issuedCount: 1 },
  });

  // Hold the archive update uncommitted so the claimant reads the prior
  // published state, then wait until its guarded inventory UPDATE is blocked.
  await locker.$transaction(async (tx) => {
    await tx.coupon.update({ where: { id: couponId! }, data: { archivedAt: new Date() } });
    const [{ pid }] = await tx.$queryRaw<Array<{ pid: number }>>`SELECT pg_backend_pid() AS pid`;
    pendingClaim = claimCouponByToken({ claimToken: stamp, profileId: secondGuest.id });
    pendingClaim.catch(() => undefined);
    const deadline = Date.now() + 10_000;
    while (Date.now() < deadline) {
      const [{ blocked }] = await tx.$queryRaw<Array<{ blocked: boolean }>>`
        SELECT EXISTS (
          SELECT 1 FROM pg_stat_activity WHERE ${pid} = ANY(pg_blocking_pids(pid))
        ) AS blocked
      `;
      if (blocked) return;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error("Concurrent claimant did not reach the archive lock");
  }, { timeout: 15_000 });
  assert.equal((await pendingClaim!).status, "UNLISTED",
    "A claim that loses to archiving must not report sold out");
  await setCouponCampaignArchived({ couponId, profileId: owner.id, archived: false });

  assert.equal(
    (await setCouponCampaignArchived({ couponId, profileId: owner.id, archived: true })).status,
    "ARCHIVED",
  );
  assert.equal(
    await setTicketDefinitionArchived({ definitionId, archived: true }),
    true,
  );
  const archivedCoupon = await prisma.coupon.findUniqueOrThrow({ where: { id: couponId } });
  const archivedTicket = await prisma.inventoryItemDefinition.findUniqueOrThrow({ where: { id: definitionId } });
  assert.equal((await setCouponCampaignArchived({ couponId, profileId: owner.id, archived: true })).status, "ARCHIVED");
  assert.equal(await setTicketDefinitionArchived({ definitionId, archived: true }), true);
  assert.deepEqual((await prisma.coupon.findUniqueOrThrow({ where: { id: couponId } })).archivedAt, archivedCoupon.archivedAt);
  assert.deepEqual((await prisma.inventoryItemDefinition.findUniqueOrThrow({ where: { id: definitionId } })).archivedAt, archivedTicket.archivedAt);
  assert.equal((await setCouponCampaignArchived({ couponId, profileId: secondGuest.id, archived: false })).status, "FORBIDDEN");
  assert.equal(
    (await claimCouponByToken({ claimToken: stamp, profileId: secondGuest.id })).status,
    "UNLISTED",
  );
  assert.equal(
    (await issueTicketBatch({
      actorProfileId: admin.id,
      definitionId,
      quantity: 1,
      recipientCode: secondGuest.friendCode!,
      requestId: randomUUID(),
    })).status,
    "ARCHIVED",
  );
  const ownedCoupon = await prisma.couponWalletItem.findFirstOrThrow({
    where: { couponId, ownerProfileId: firstGuest.id },
  });
  assert.equal(
    isCouponWalletItemUsable({
      campaignExpiresAt: coupon.expiresAt,
      campaignValidFrom: coupon.validFrom,
      merchantIsActive: true,
      walletStatus: ownedCoupon.status,
    }),
    true,
  );
  const ownedTicket = await prisma.inventoryItem.findFirstOrThrow({
    where: { definitionId, ownerProfileId: firstGuest.id },
  });
  assert.equal(ownedTicket.redeemedAt, null);
  assert.equal(
    (await prisma.inventoryItemDefinition.findUniqueOrThrow({ where: { id: definitionId } })).isGiftable,
    true,
  );
  const couponCredential = await generateCouponRedemptionToken({ itemId: ownedCoupon.id, profileId: firstGuest.id });
  assert.equal(couponCredential.status, "GENERATED");
  if (couponCredential.status !== "GENERATED") throw new Error("Coupon redemption credential unavailable");
  assert.equal((await getCouponRedemptionPreview({ profileId: owner.id, redemptionToken: couponCredential.token }))?.isAvailable, true);
  assert.equal(await getCouponRedemptionPreview({ profileId: secondGuest.id, redemptionToken: couponCredential.token }), null);
  const ticketCredential = await prisma.$transaction((tx) => generateTicketTokenInTransaction(tx, {
    itemId: ownedTicket.id, ownerProfileId: firstGuest.id, now: new Date(),
  }));
  assert.equal(ticketCredential.status, "READY");
  if (ticketCredential.status !== "READY") throw new Error("Ticket redemption credential unavailable");
  const rollbackCheckIn = new Error("Roll back temporary ticket check-in history");
  try {
    await prisma.$transaction(async (tx) => {
      const checkIn = (actorProfileId: string) => redeemTicketInTransaction(tx, {
        actorProfileId, expectedDefinitionId: definitionId!, isAdmin: false, now: new Date(), token: ticketCredential.code,
      });
      assert.equal((await checkIn(secondGuest.id)).status, "FORBIDDEN");
      assert.equal((await checkIn(owner.id)).status, "REDEEMED");
      assert.equal((await checkIn(owner.id)).status, "ALREADY_REDEEMED");
      throw rollbackCheckIn;
    });
  } catch (error) {
    if (error !== rollbackCheckIn) throw error;
  }

  assert.equal(
    (await setCouponCampaignArchived({ couponId, profileId: owner.id, archived: false })).status,
    "RESTORED",
  );
  assert.equal(
    await setTicketDefinitionArchived({ definitionId, archived: false }),
    true,
  );
  assert.equal((await setCouponCampaignArchived({ couponId, profileId: owner.id, archived: false })).status, "RESTORED");
  assert.equal(await setTicketDefinitionArchived({ definitionId, archived: false }), true);
  const restoredCoupon = await prisma.coupon.findUniqueOrThrow({ where: { id: couponId } });
  assert.equal(getCouponClaimAvailability(restoredCoupon), "AVAILABLE");
  const restoredTicket = await prisma.inventoryItemDefinition.findUniqueOrThrow({
    where: { id: definitionId },
  });
  assert.equal(restoredTicket.archivedAt, null);
  assert.equal(restoredTicket.issuedCount, 1);
  console.log("PASS archive regression: concurrent claim result, idempotent operations, ownership boundaries, archived coupon credentials and single ticket check-in, restored availability");
} finally {
  await pendingClaim?.catch(() => undefined);
  await locker.$disconnect();
  if (profileIds.length) {
    await prisma.notification.deleteMany({
      where: {
        OR: [
          { actorId: { in: profileIds } },
          { recipientId: { in: profileIds } },
        ],
      },
    });
  }
  if (definitionId) {
    await prisma.ticketAccess.deleteMany({ where: { definitionId } });
    await prisma.inventoryItem.deleteMany({ where: { definitionId } });
    await prisma.inventoryIssueBatch.deleteMany({ where: { definitionId } });
    await prisma.inventoryItemDefinition.delete({ where: { id: definitionId } });
  }
  if (couponId) {
    await prisma.couponCampaignClaim.deleteMany({ where: { couponId } });
    await prisma.couponWalletItem.deleteMany({ where: { couponId } });
    await prisma.coupon.delete({ where: { id: couponId } });
  }
  if (merchantId) await prisma.merchant.delete({ where: { id: merchantId } });
  if (profileIds.length)
    await prisma.userProfile.deleteMany({ where: { id: { in: profileIds } } });
  await prisma.$disconnect();
  console.log("Preview archive probe records cleaned");
}
