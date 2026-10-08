import { calculateBalances, type LedgerTransactionInput } from "./ledger";
import { parseMoneyToMinor } from "./money";

export const AA_EXPENSE = "aa-simple-expense";
export const AA_PREPAYMENT = "aa-simple-prepayment";
export const AA_SETTLEMENT = "aa-simple-settlement";
export type AaPerson = { id: string; name: string; active: boolean; paymentMethod?: string | null };
export type AaRecord = {
  id: string; type: LedgerTransactionInput["type"]; status: LedgerTransactionInput["status"];
  title: string; note: string; amount: string; source: string | null; creatorId: string;
  from: string | null; to: string | null; paidAt: string | null; receivedAt: string | null; round: string | null;
  contributions: { participantId: string; amount: string }[];
  shares: { participantId: string; amount: string }[];
};
export type AaSimpleState = {
  id: string; activityId: string; title: string; currency: string; version: number;
  status: "ACTIVE" | "FROZEN" | "ARCHIVED"; startedAt: string | null;
  viewerId: string; canManage: boolean; canSettle: boolean; participants: AaPerson[]; records: AaRecord[];
  legacyBlocked: boolean;
};
export type AaCommand = {
  intent: "expense" | "prepayment" | "delete" | "start" | "reopen" | "pay" | "undoPay" | "receive" | "dispute" | "received" | "unpaid";
  operationId: string; expectedVersion: number; recordId?: string;
  amount?: string; title?: string; note?: string; payerId?: string; recipientId?: string; participantIds?: string[];
};

function requireThat(ok: unknown, message: string): asserts ok {
  if (!ok) throw new Error(message);
}

// Amounts are persisted per participant. Historical shares are never re-split.
export function splitSimpleExpense(amount: bigint, payerId: string, participantIds: string[]) {
  requireThat(amount > 0n, "INVALID_AMOUNT");
  requireThat(participantIds.length > 0 && new Set(participantIds).size === participantIds.length, "INVALID_PARTICIPANTS");
  const order = [...participantIds.filter(id => id === payerId), ...participantIds.filter(id => id !== payerId)];
  const count = BigInt(order.length);
  const remainder = amount % count;
  return order.map((participantId, index) => ({ participantId, amount: (amount / count + (BigInt(index) < remainder ? 1n : 0n)).toString() }));
}

export function toSimpleAccountingInput(record: AaRecord): LedgerTransactionInput {
  return {
    id: record.id, type: record.type,
    // A reported payment stays reserved while the two parties reconcile it.
    status: record.source === AA_SETTLEMENT && record.status === "DISPUTED" && (record.paidAt || record.receivedAt) ? "POSTED" : record.status,
    baseAmountMinor: BigInt(record.amount),
    contributions: record.contributions.map(item => ({ participantId: item.participantId, amountMinor: BigInt(item.amount) })),
    shares: record.shares.map(item => ({ participantId: item.participantId, amountMinor: BigInt(item.amount) })),
    transferFromParticipantId: record.from, transferToParticipantId: record.to,
  };
}

export function simpleBalances(state: AaSimpleState) {
  return calculateBalances(state.participants.map(person => person.id), state.records.map(toSimpleAccountingInput));
}

// A debit caused entirely by money received in advance is a refund, not a new shared expense.
export function isPrepaymentRefund(state: AaSimpleState, personId: string, balance: bigint) {
  if (balance >= 0n) return false;
  const received = state.records
    .filter(record => record.source === AA_PREPAYMENT && record.status === "POSTED" && record.to === personId)
    .reduce((sum, record) => sum + BigInt(record.amount), 0n);
  return received > 0n && balance + received >= 0n;
}

export function simpleSuggestions(state: AaSimpleState) {
  const balances = simpleBalances(state);
  const rank = new Map(state.participants.map((person, i) => [person.id, i]));
  const debtors = balances.filter(p => p.balanceMinor < 0n).map(p => ({ id: p.participantId, amount: -p.balanceMinor }));
  const creditors = balances.filter(p => p.balanceMinor > 0n).map(p => ({ id: p.participantId, amount: p.balanceMinor }));
  const compare = (a: typeof debtors[number], b: typeof debtors[number]) => a.amount === b.amount ? rank.get(a.id)! - rank.get(b.id)! : a.amount > b.amount ? -1 : 1;
  const result: { from: string; to: string; amount: string }[] = [];
  while (debtors.length && creditors.length) {
    debtors.sort(compare); creditors.sort(compare);
    const from = debtors[0], to = creditors[0];
    const amount = from.amount < to.amount ? from.amount : to.amount;
    result.push({ from: from.id, to: to.id, amount: amount.toString() });
    from.amount -= amount; to.amount -= amount;
    if (from.amount === 0n) debtors.shift();
    if (to.amount === 0n) creditors.shift();
  }
  return result;
}

export function assertSimplePlan(state: AaSimpleState) {
  simpleBalances(state);
  if (state.status !== "FROZEN" || !state.startedAt) return;
  const pending = state.records.filter(r => r.source === AA_SETTLEMENT && r.status === "PENDING_CONFIRMATION");
  // Persist the plan; paying one instruction must not redirect someone else's payment.
  const projected = { ...state, records: state.records.map(r => pending.includes(r) ? { ...r, status: "POSTED" as const } : r) };
  requireThat(simpleBalances(projected).every(p => p.balanceMinor === 0n), "PLAN_CHANGED");
}

export function applyAaCommand(original: AaSimpleState, command: AaCommand, now: string): AaSimpleState {
  requireThat(command.expectedVersion === original.version, "STALE_VERSION");
  requireThat(original.currency === "EUR", "UNSUPPORTED_CURRENCY");
  const state = structuredClone(original);
  const viewer = state.participants.find(p => p.id === state.viewerId);
  requireThat(viewer, "FORBIDDEN");
  requireThat(state.status !== "ARCHIVED", "LOCKED");
  const manager = state.canManage;
  const disputed = state.records.some(r => r.status === "DISPUTED");
  const record = state.records.find(r => r.id === command.recordId);
  const activePerson = (id?: string) => {
    requireThat(id && state.participants.some(p => p.id === id && p.active), "INVALID_PARTICIPANTS");
    return id;
  };
  const editable = () => {
    requireThat(state.status === "ACTIVE" && !disputed, "LOCKED");
    requireThat(viewer.active || manager, "FORBIDDEN");
    if (command.recordId) {
      requireThat(record && [AA_EXPENSE, AA_PREPAYMENT].includes(record.source ?? "") && record.status === "POSTED", "INVALID_RECORD");
      requireThat(manager || record.creatorId === viewer.id, "FORBIDDEN");
    }
  };
  if (command.intent === "expense" || command.intent === "prepayment") {
    editable();
    requireThat(state.records.filter(r => r.status !== "VOIDED").length < 10000, "CAPACITY");
    const amount = parseMoneyToMinor(command.amount ?? "");
    requireThat(amount > 0n && amount <= 99999999999n, "INVALID_AMOUNT");
    const payerId = activePerson(command.payerId);
    const title = (command.title ?? "").trim();
    requireThat(title.length > 0 && title.length <= 120 && (command.note ?? "").length <= 2000, "INVALID_RECORD");
    const next: AaRecord = {
      id: record?.id ?? command.operationId, type: command.intent === "expense" ? "EXPENSE" : "TRANSFER", status: "POSTED",
      title, note: command.note ?? "", amount: amount.toString(), source: command.intent === "expense" ? AA_EXPENSE : AA_PREPAYMENT,
      creatorId: record?.creatorId ?? viewer.id, from: null, to: null, paidAt: null, receivedAt: null, round: null, contributions: [], shares: [],
    };
    if (command.intent === "expense") {
      const ids = command.participantIds ?? [];
      ids.forEach(activePerson);
      next.shares = splitSimpleExpense(amount, payerId, ids);
      next.contributions = [{ participantId: payerId, amount: amount.toString() }];
    } else {
      const recipientId = activePerson(command.recipientId);
      requireThat(payerId !== recipientId, "INVALID_PARTICIPANTS");
      requireThat(manager || payerId === viewer.id, "FORBIDDEN");
      next.from = payerId; next.to = recipientId; next.paidAt = now;
    }
    requireThat(record || !state.records.some(r => r.id === next.id), "DUPLICATE_RECORD");
    state.records = record ? state.records.map(r => r.id === record.id ? next : r) : [...state.records, next];
  } else if (command.intent === "delete") {
    editable(); requireThat(record, "INVALID_RECORD"); record.status = "VOIDED";
  } else if (command.intent === "start") {
    requireThat(state.canSettle, "FORBIDDEN");
    requireThat(state.status === "ACTIVE" && !disputed && !state.legacyBlocked, "BLOCKED");
    requireThat(state.records.some(r => r.status === "POSTED"), "EMPTY_LEDGER");
    state.startedAt = now; state.status = "FROZEN";
    simpleSuggestions(state).forEach((item, index) => state.records.push({
      id: `${command.operationId}:${index}`, type: "TRANSFER", status: "PENDING_CONFIRMATION", title: "结算付款", note: "",
      ...item, source: AA_SETTLEMENT, creatorId: viewer.id, paidAt: null, receivedAt: null, round: command.operationId, contributions: [], shares: [],
    }));
  } else if (command.intent === "reopen") {
    requireThat(state.canSettle, "FORBIDDEN");
    requireThat(state.status === "FROZEN" && !disputed &&
      !state.records.some(r => r.source === AA_SETTLEMENT && r.status === "PENDING_CONFIRMATION" && r.paidAt), "BLOCKED");
    state.records.forEach(r => { if (r.source === AA_SETTLEMENT && r.status === "PENDING_CONFIRMATION") r.status = "VOIDED"; });
    state.status = "ACTIVE"; state.startedAt = null;
  } else {
    requireThat(record?.source === AA_SETTLEMENT, "INVALID_RECORD");
    if (command.intent === "pay") {
      requireThat(record.from === viewer.id, "FORBIDDEN");
      if (record.status === "POSTED" || (record.status === "PENDING_CONFIRMATION" && record.paidAt)) return original;
      requireThat(state.status === "FROZEN" && !disputed && !state.legacyBlocked && record.status === "PENDING_CONFIRMATION", "BLOCKED");
      assertSimplePlan(state);
      // Payer acknowledgement is visible to the recipient, but cannot settle the balance alone.
      record.paidAt = now;
    } else if (command.intent === "undoPay") {
      requireThat(record.from === viewer.id, "FORBIDDEN");
      requireThat(state.status === "FROZEN" && !disputed && record.status === "PENDING_CONFIRMATION", "BLOCKED");
      if (!record.paidAt) return original;
      record.paidAt = null;
    } else if (command.intent === "receive") {
      requireThat(record.to === viewer.id, "FORBIDDEN");
      if (record.status === "POSTED" && record.receivedAt) return original;
      requireThat(!disputed && !state.legacyBlocked &&
        (state.status === "FROZEN" && record.status === "PENDING_CONFIRMATION" ||
          record.status === "POSTED" && Boolean(record.paidAt)), "BLOCKED");
      if (record.status === "PENDING_CONFIRMATION") assertSimplePlan(state);
      // The recipient may confirm directly, without waiting for the payer's acknowledgement.
      record.status = "POSTED"; record.receivedAt = now;
    } else if (command.intent === "dispute") {
      requireThat(record.to === viewer.id, "FORBIDDEN");
      requireThat(record.status === "POSTED", "INVALID_RECORD");
      record.status = "DISPUTED";
    } else {
      requireThat(state.canSettle && record.status === "DISPUTED", "FORBIDDEN");
      if (command.intent === "received") record.status = "POSTED";
      else {
        record.status = "VOIDED";
        state.records.forEach(r => { if (r.source === AA_SETTLEMENT && r.status === "PENDING_CONFIRMATION") r.status = "VOIDED"; });
        state.status = "ACTIVE"; state.startedAt = null;
      }
    }
  }
  state.version += 1;
  assertSimplePlan(state);
  return state;
}
