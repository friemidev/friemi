import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getActivityAaAccess } from "./access";
import type { AaAccess } from "./access";
import { ensureActivityAaLedger } from "./ledgerService";
import { AA_SETTLEMENT, type AaSimpleState } from "../domain/simpleLedger";

export const simpleLedgerInclude = {
  participants: { orderBy: [{ joinedAt: "asc" }, { id: "asc" }] },
  transactions: { orderBy: [{ createdAt: "asc" }, { id: "asc" }], include: {
    contributions: true, shares: { orderBy: [{ ruleValue: "asc" }, { id: "asc" }] },
    conflicts: { where: { status: "OPEN" } }, changeRequests: { where: { status: "PENDING" } },
  } },
} satisfies Prisma.AaLedgerInclude;

export function projectSimpleLedger(
  ledger: Prisma.AaLedgerGetPayload<{ include: typeof simpleLedgerInclude }>,
  profileId: string, access: AaAccess,
): AaSimpleState {
  const viewer = ledger.participants.find(person => person.userProfileId === profileId);
  if (!viewer) throw new Error("FORBIDDEN");
  return {
    id: ledger.id, activityId: ledger.activityId!, title: ledger.titleSnapshot, currency: ledger.baseCurrency,
    status: ledger.status, version: ledger.version, startedAt: ledger.settlementStartedAt?.toISOString() ?? null,
    viewerId: viewer.id, canManage: access.canManage, canSettle: access.role === "OWNER" && viewer.status === "ACTIVE",
    participants: ledger.participants.map(person => ({ id: person.id, name: person.displayNameSnapshot, active: person.status === "ACTIVE" })),
    legacyBlocked: ledger.transactions.some(t => t.conflicts.length || t.changeRequests.length ||
      (t.importSource !== AA_SETTLEMENT && ["PENDING_CONFIRMATION", "PENDING_REVIEW", "DISPUTED"].includes(t.status))),
    records: ledger.transactions.map(t => ({
      id: t.id, type: t.type, status: t.status, title: t.title, note: t.note ?? "", amount: t.baseAmountMinor.toString(),
      source: t.importSource, creatorId: t.creatorParticipantId, from: t.transferFromParticipantId, to: t.transferToParticipantId,
      paidAt: t.payerConfirmedAt?.toISOString() ?? null,
      round: t.importSource === AA_SETTLEMENT ? t.id.slice(0, t.id.lastIndexOf(":")) : null,
      contributions: t.contributions.map(item => ({ participantId: item.participantId, amount: item.amountMinor.toString() })),
      shares: t.shares.map(item => ({ participantId: item.participantId, amount: item.amountMinor.toString() })),
    })),
  };
}

export async function getSimpleAaState(activityId: string, profileId: string) {
  await ensureActivityAaLedger(activityId, profileId);
  return prisma.$transaction(async tx => {
    const access = await getActivityAaAccess(activityId, profileId, tx);
    const ledger = await tx.aaLedger.findUnique({ where: { activityId }, include: simpleLedgerInclude });
    if (!access || !ledger) throw new Error("FORBIDDEN");
    return projectSimpleLedger(ledger, profileId, access);
  });
}
