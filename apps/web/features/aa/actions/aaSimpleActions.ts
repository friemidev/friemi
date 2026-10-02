"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getCurrentUserProfileForMutation } from "@/lib/auth";
import { getActivityAaAccess } from "../server/access";
import { ensureActivityAaLedger } from "../server/ledgerService";
import { createAaNotifications } from "../server/notifications";
import { projectSimpleLedger, simpleLedgerInclude } from "../server/simpleLedgerService";
import { applyAaCommand, AA_SETTLEMENT, type AaCommand, type AaSimpleState } from "../domain/simpleLedger";

const schema = z.object({
  intent: z.enum(["expense", "prepayment", "delete", "start", "reopen", "pay", "dispute", "received", "unpaid"]),
  operationId: z.string().uuid(), expectedVersion: z.number().int().positive(), recordId: z.string().max(120).optional(),
  amount: z.string().max(16).optional(), title: z.string().max(120).optional(), note: z.string().max(2000).optional(),
  payerId: z.string().max(120).optional(), recipientId: z.string().max(120).optional(), participantIds: z.array(z.string().max(120)).max(50).optional(),
});

export async function runAaSimpleCommand(activityId: string, locale: string, input: AaCommand): Promise<{ state?: AaSimpleState; error?: string }> {
  if (!activityId || activityId.length > 120 || !["zh-CN", "en", "fr"].includes(locale)) return { error: "INVALID_RECORD" };
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { error: "INVALID_RECORD" };
  const command = parsed.data;
  const profile = await getCurrentUserProfileForMutation(locale, `/lobby/${activityId}/aa`);
  try {
    await ensureActivityAaLedger(activityId, profile.id);
    const state = await prisma.$transaction(async tx => {
      const access = await getActivityAaAccess(activityId, profile.id, tx);
      const ledger = await tx.aaLedger.findUnique({ where: { activityId }, include: simpleLedgerInclude });
      if (!access || !ledger) throw new Error("FORBIDDEN");
      const original = projectSimpleLedger(ledger, profile.id, access);
      const fingerprint = JSON.stringify(command);
      const replay = await tx.aaAuditEvent.findFirst({ where: { ledgerId: ledger.id, entityType: "AA_COMMAND", entityId: command.operationId } });
      if (replay) {
        if (replay.actorParticipantId !== original.viewerId || (replay.after as { command?: string })?.command !== fingerprint) throw new Error("INVALID_RECORD");
        return original;
      }
      const now = new Date();
      const next = applyAaCommand(original, command, now.toISOString());
      if (next === original) return original;
      const updated = await tx.aaLedger.updateMany({
        where: { id: ledger.id, version: command.expectedVersion },
        data: { status: next.status, version: next.version, settlementStartedAt: next.startedAt ? new Date(next.startedAt) : null,
          frozenAt: next.status === "FROZEN" ? ledger.frozenAt ?? now : null },
      });
      if (updated.count !== 1) throw new Error("STALE_VERSION");
      const originalById = new Map(original.records.map(record => [record.id, record]));
      const nextById = new Map(next.records.map(record => [record.id, record]));
      for (const record of next.records) {
        const old = originalById.get(record.id);
        if (JSON.stringify(old) === JSON.stringify(record)) continue;
        if (old && ["expense", "prepayment"].includes(command.intent)) {
          await tx.aaContribution.deleteMany({ where: { transactionId: record.id } });
          await tx.aaShare.deleteMany({ where: { transactionId: record.id } });
        }
        const splits = !old || ["expense", "prepayment"].includes(command.intent) ? {
          contributions: { create: record.contributions.map(item => ({ participantId: item.participantId, amountMinor: BigInt(item.amount) })) },
          shares: { create: record.shares.map((item, index) => ({ participantId: item.participantId, amountMinor: BigInt(item.amount), ruleValue: String(index + 1) })) },
        } : {};
        const data = {
          title: record.title, note: record.note || null, type: record.type, status: record.status,
          baseAmountMinor: BigInt(record.amount), originalAmountMinor: BigInt(record.amount), originalCurrency: "EUR", fxRate: "1",
          splitMode: record.type === "EXPENSE" ? "EQUAL" as const : null, importSource: record.source,
          transferFromParticipantId: record.from, transferToParticipantId: record.to,
          payerConfirmedAt: record.paidAt ? new Date(record.paidAt) : null,
          payerConfirmedById: record.paidAt ? record.from : null,
          voidedAt: record.status === "VOIDED" ? now : null, voidedByParticipantId: record.status === "VOIDED" ? original.viewerId : null,
          ...splits,
        };
        if (old) await tx.aaTransaction.update({ where: { id: record.id }, data: { ...data, version: { increment: 1 } } });
        else await tx.aaTransaction.create({ data: { ...data, id: record.id, ledgerId: ledger.id, creatorParticipantId: record.creatorId,
          occurredAt: now, categoryNameSnapshot: record.type === "EXPENSE" ? "其他" : "转账",
          clientMutationId: record.id, importRecordId: record.id,
        } });
      }
      // Cancel old payment links when a new plan replaces their instructions.
      if (["start", "reopen", "unpaid"].includes(command.intent)) await tx.aaPaymentRequest.updateMany({
        where: { ledgerId: ledger.id, status: { in: ["DRAFT", "SENT", "VIEWED"] } }, data: { status: "CANCELLED" },
      });
      await tx.aaAuditEvent.create({ data: {
        ledgerId: ledger.id, actorParticipantId: original.viewerId, action: `SIMPLE_${command.intent.toUpperCase()}`,
        entityType: "AA_COMMAND", entityId: command.operationId,
        before: { version: original.version, records: original.records.filter(r => JSON.stringify(r) !== JSON.stringify(nextById.get(r.id))) },
        after: { command: fingerprint, version: next.version, recordIds: next.records.filter(r => r.source === AA_SETTLEMENT && r.round === command.operationId).map(r => r.id) },
      } });
      if (["start", "reopen", "pay", "dispute", "received", "unpaid"].includes(command.intent)) {
        const actor = ledger.participants.find(person => person.id === original.viewerId)!;
        const shared = { activityId, actor, participants: ledger.participants, occurrenceId: command.operationId };
        const notify = async (type: "AA_PAYMENT_REQUEST" | "AA_ENTRY_UPDATED" | "AA_DISPUTE_OPENED", ids: string[]) => {
          await createAaNotifications(tx, { ...shared, type, recipientParticipantIds: ids });
        };
        if (command.intent === "start") {
          const debtors = new Set(next.records.filter(r => r.source === AA_SETTLEMENT && r.round === command.operationId).map(r => r.from!));
          await notify("AA_PAYMENT_REQUEST", [...debtors]);
          await notify("AA_ENTRY_UPDATED", ledger.participants.filter(p => !debtors.has(p.id)).map(p => p.id));
        } else if (command.intent === "reopen") await notify("AA_ENTRY_UPDATED", ledger.participants.map(p => p.id));
        else {
          const payment = next.records.find(r => r.id === command.recordId);
          if (payment) await notify(command.intent === "dispute" ? "AA_DISPUTE_OPENED" : "AA_ENTRY_UPDATED",
            command.intent === "dispute" ? [...ledger.participants.filter(p => p.role === "OWNER" || p.role === "ADMIN").map(p => p.id), payment.from!] : [payment.from!, payment.to!]);
        }
      }
      return next;
    }, { isolationLevel: "Serializable", timeout: 15000 });
    revalidatePath(`/${locale}/lobby/${activityId}/aa`, "layout");
    revalidatePath(`/${locale}/lobby/${activityId}`);
    return { state };
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "P2034" || code === "P2002") return { error: "STALE_VERSION" };
    const message = error instanceof Error ? error.message : "FAILED";
    const expected = ["STALE_VERSION", "FORBIDDEN", "LOCKED", "BLOCKED", "EMPTY_LEDGER", "INVALID_AMOUNT", "INVALID_PARTICIPANTS", "INVALID_RECORD", "UNSUPPORTED_CURRENCY", "PLAN_CHANGED", "CAPACITY", "TOO_MANY_DECIMALS", "INVALID_MONEY"];
    return { error: expected.includes(message) ? message : "FAILED" };
  }
}
