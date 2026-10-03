import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { AA_SETTLEMENT } from "../features/aa/domain/simpleLedger";
import { projectSimpleLedger, simpleLedgerInclude } from "../features/aa/server/simpleLedgerService";

const databaseUrl = process.env.AA_PAYMENT_METHOD_TEST_DATABASE_URL;
if (!databaseUrl || !["localhost", "127.0.0.1"].includes(new URL(databaseUrl).hostname)) {
  throw new Error("AA_PAYMENT_METHOD_TEST_DATABASE_URL must point to an isolated local PostgreSQL database");
}

const client = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
const marker = randomUUID();
const profileIds: string[] = [];
let ledgerId: string | null = null;

try {
  const profiles = await Promise.all(["payer", "recipient", "other"].map(async name => {
    const profile = await client.userProfile.create({
      data: { clerkUserId: `aa-payment-audit-${marker}-${name}`, nickname: name },
    });
    profileIds.push(profile.id);
    return profile;
  }));
  const ledger = await client.aaLedger.create({
    data: { titleSnapshot: "AA payment method audit", status: "FROZEN", settlementStartedAt: new Date() },
  });
  ledgerId = ledger.id;
  const participants = await Promise.all(profiles.map(async (profile, index) => client.aaParticipant.create({
    data: { ledgerId: ledger.id, userProfileId: profile.id, displayNameSnapshot: ["payer", "recipient", "other"][index] },
  })));
  await client.aaTransaction.create({
    data: {
      ledgerId: ledger.id, creatorParticipantId: participants[0].id,
      transferFromParticipantId: participants[0].id, transferToParticipantId: participants[1].id,
      type: "TRANSFER", status: "PENDING_CONFIRMATION", importSource: AA_SETTLEMENT,
      title: "Settlement", originalCurrency: "EUR", originalAmountMinor: 500n,
      baseAmountMinor: 500n, occurredAt: new Date(),
    },
  });
  await client.aaParticipant.update({
    where: { id: participants[1].id }, data: { paymentMethod: "Revolut @recipient" },
  });
  const read = () => client.aaLedger.findUniqueOrThrow({ where: { id: ledger.id }, include: simpleLedgerInclude });
  const access = { canManage: false, role: "MEMBER" as const };
  const payerView = projectSimpleLedger(await read(), profiles[0].id, access);
  const otherView = projectSimpleLedger(await read(), profiles[2].id, access);
  assert.equal(payerView.participants[1].paymentMethod, "Revolut @recipient");
  assert.equal(otherView.participants[1].paymentMethod, null);

  await client.aaTransaction.updateMany({ where: { ledgerId: ledger.id }, data: { status: "POSTED" } });
  const paidPayerView = projectSimpleLedger(await read(), profiles[0].id, access);
  assert.equal(paidPayerView.participants[1].paymentMethod, null);
  await client.aaLedger.update({ where: { id: ledger.id }, data: { status: "ARCHIVED" } });
  const removed = await client.aaParticipant.updateMany({
    where: { userProfileId: profiles[1].id, ledgerId: ledger.id },
    data: { paymentMethod: null },
  });
  assert.equal(removed.count, 1);
  assert.equal((await client.aaParticipant.findUniqueOrThrow({ where: { id: participants[1].id } })).paymentMethod, null);
  console.log("AA payment method database smoke test passed");
} finally {
  if (ledgerId) {
    await client.aaTransaction.deleteMany({ where: { ledgerId } });
    await client.aaLedger.delete({ where: { id: ledgerId } });
  }
  if (profileIds.length) await client.userProfile.deleteMany({ where: { id: { in: profileIds } } });
  await client.$disconnect();
}
