import assert from "node:assert/strict";
import test from "node:test";
import { getParticipantSettlementProgress } from "./settlementProgress";

const settlement = {
  fromParticipantId: "payer",
  toParticipantId: "payee",
};

const pendingTransfer = {
  payeeConfirmedAt: null,
  payerConfirmedAt: "2026-09-18T10:00:00.000Z",
  relatedParticipantIds: ["payer", "payee"],
  status: "PENDING_CONFIRMATION",
  transferFromParticipantId: "payer",
  transferToParticipantId: "payee",
  type: "TRANSFER",
};

test("open settlement paths expose payer and recipient states", () => {
  assert.equal(
    getParticipantSettlementProgress({
      balanceMinor: -2500n,
      participantId: "payer",
      settlements: [settlement],
      transactions: [],
    }),
    "PAY",
  );
  assert.equal(
    getParticipantSettlementProgress({
      balanceMinor: 2500n,
      participantId: "payee",
      settlements: [settlement],
      transactions: [],
    }),
    "RECEIVE",
  );
});

test("a payer-marked transfer creates distinct two-sided states", () => {
  assert.equal(
    getParticipantSettlementProgress({
      balanceMinor: -2500n,
      participantId: "payer",
      settlements: [],
      transactions: [pendingTransfer],
    }),
    "PAID_WAITING",
  );
  assert.equal(
    getParticipantSettlementProgress({
      balanceMinor: 2500n,
      participantId: "payee",
      settlements: [],
      transactions: [pendingTransfer],
    }),
    "CONFIRM_RECEIPT",
  );
});

test("an unpaid path takes priority over another payment awaiting confirmation", () => {
  assert.equal(
    getParticipantSettlementProgress({
      balanceMinor: -4000n,
      participantId: "payer",
      settlements: [
        {
          fromParticipantId: "payer",
          toParticipantId: "second-payee",
        },
      ],
      transactions: [pendingTransfer],
    }),
    "PAY",
  );
});

test("posted transfers with zero balances settle both participants", () => {
  const postedTransfer = {
    ...pendingTransfer,
    payeeConfirmedAt: "2026-09-18T10:05:00.000Z",
    status: "POSTED",
  };

  for (const participantId of ["payer", "payee"]) {
    assert.equal(
      getParticipantSettlementProgress({
        balanceMinor: 0n,
        participantId,
        settlements: [],
        transactions: [postedTransfer],
      }),
      "SETTLED",
    );
  }
});

test("disputes take priority over calculated balances", () => {
  assert.equal(
    getParticipantSettlementProgress({
      balanceMinor: 0n,
      participantId: "payer",
      settlements: [],
      transactions: [
        {
          ...pendingTransfer,
          status: "DISPUTED",
        },
      ],
    }),
    "DISPUTED",
  );
});
