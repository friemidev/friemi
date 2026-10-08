import assert from "node:assert/strict";
import test from "node:test";
import { AA_SETTLEMENT } from "../domain/simpleLedger";
import { decodePaymentMethods, encodePaymentMethods } from "../domain/paymentMethods";
import { projectSimpleLedger } from "./simpleLedgerService";

test("payment details are exposed only to their owner and current payer", () => {
  const participant = (id: string) => ({
    id,
    userProfileId: id,
    displayNameSnapshot: id,
    status: "ACTIVE",
    paymentMethod: id === "recipient" ? encodePaymentMethods(["Revolut @recipient", "IBAN for recipient"]) : `IBAN for ${id}`,
  });
  const transfer = {
    id: "transfer-1",
    importSource: AA_SETTLEMENT,
    status: "PENDING_CONFIRMATION",
    transferFromParticipantId: "payer",
    transferToParticipantId: "recipient",
    type: "TRANSFER",
    title: "Settlement",
    note: null,
    baseAmountMinor: 500n,
    creatorParticipantId: "payer",
    payerConfirmedAt: null,
    payeeConfirmedAt: null,
    contributions: [],
    shares: [],
    conflicts: [],
    changeRequests: [],
  };
  const ledger = {
    id: "ledger",
    activityId: "activity",
    titleSnapshot: "Dinner",
    baseCurrency: "EUR",
    status: "FROZEN",
    version: 1,
    settlementStartedAt: new Date("2026-10-03T12:00:00Z"),
    participants: [participant("payer"), participant("recipient"), participant("other")],
    transactions: [transfer],
  } as unknown as Parameters<typeof projectSimpleLedger>[0];
  const access = { canManage: false, role: "MEMBER" as const };

  const payerView = projectSimpleLedger(ledger, "payer", access);
  assert.deepEqual(decodePaymentMethods(payerView.participants.find(person => person.id === "recipient")?.paymentMethod), ["Revolut @recipient", "IBAN for recipient"]);
  assert.equal(payerView.participants.find(person => person.id === "other")?.paymentMethod, null);

  const recipientView = projectSimpleLedger(ledger, "recipient", access);
  assert.deepEqual(decodePaymentMethods(recipientView.participants.find(person => person.id === "recipient")?.paymentMethod), ["Revolut @recipient", "IBAN for recipient"]);
  assert.equal(recipientView.participants.find(person => person.id === "payer")?.paymentMethod, null);

  const paidLedger = { ...ledger, transactions: [{ ...transfer, status: "POSTED" }] } as unknown as typeof ledger;
  const paidView = projectSimpleLedger(paidLedger, "payer", access);
  assert.equal(paidView.participants.find(person => person.id === "recipient")?.paymentMethod, null);

  const receiptLedger = { ...ledger, transactions: [{ ...transfer, status: "POSTED", payeeConfirmedAt: new Date("2026-10-03T13:00:00Z") }] } as unknown as typeof ledger;
  const receiptView = projectSimpleLedger(receiptLedger, "recipient", access);
  assert.equal(receiptView.records[0].paidAt, null);
  assert.equal(receiptView.records[0].receivedAt, "2026-10-03T13:00:00.000Z");
});
