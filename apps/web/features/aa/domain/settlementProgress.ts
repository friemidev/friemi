export type SettlementProgressState =
  | "CONFIRM_RECEIPT"
  | "DISPUTED"
  | "PAID_WAITING"
  | "PAY"
  | "RECEIVE"
  | "SETTLED";

type SettlementPath = {
  fromParticipantId: string;
  toParticipantId: string;
};

type SettlementTransaction = {
  payeeConfirmedAt: string | null;
  payerConfirmedAt: string | null;
  relatedParticipantIds: string[];
  status: string;
  transferFromParticipantId: string | null;
  transferToParticipantId: string | null;
  type: string;
};

export function getSettlementPairKey(path: SettlementPath) {
  return `${path.fromParticipantId}:${path.toParticipantId}`;
}

export function getParticipantSettlementProgress({
  balanceMinor,
  participantId,
  settlements,
  transactions,
}: {
  balanceMinor: bigint;
  participantId: string;
  settlements: SettlementPath[];
  transactions: SettlementTransaction[];
}): SettlementProgressState {
  const hasDispute = transactions.some(
    (transaction) =>
      transaction.status === "DISPUTED" &&
      transaction.relatedParticipantIds.includes(participantId),
  );

  if (hasDispute) return "DISPUTED";

  const pendingTransfers = transactions.filter(
    (transaction) =>
      transaction.type === "TRANSFER" &&
      transaction.status === "PENDING_CONFIRMATION",
  );
  const needsReceiptConfirmation = pendingTransfers.some(
    (transaction) =>
      transaction.transferToParticipantId === participantId &&
      Boolean(transaction.payerConfirmedAt) &&
      !transaction.payeeConfirmedAt,
  );

  if (needsReceiptConfirmation) return "CONFIRM_RECEIPT";

  const hasPaymentPath = settlements.some(
    (settlement) => settlement.fromParticipantId === participantId,
  );
  if (hasPaymentPath) return "PAY";

  const hasPaidTransferWaiting = pendingTransfers.some(
    (transaction) =>
      transaction.transferFromParticipantId === participantId &&
      Boolean(transaction.payerConfirmedAt) &&
      !transaction.payeeConfirmedAt,
  );

  if (hasPaidTransferWaiting) return "PAID_WAITING";

  if (balanceMinor < 0n) return "PAY";

  const hasReceivingPath = settlements.some(
    (settlement) => settlement.toParticipantId === participantId,
  );
  if (hasReceivingPath || balanceMinor > 0n) return "RECEIVE";

  return "SETTLED";
}
