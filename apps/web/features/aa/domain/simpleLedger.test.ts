import assert from "node:assert/strict";
import test from "node:test";
import { AA_SETTLEMENT, applyAaCommand, assertSimplePlan, isPrepaymentRefund, simpleBalances, simpleSuggestions, splitSimpleExpense, type AaCommand, type AaSimpleState } from "./simpleLedger";
import { createAaExample } from "./simpleFixtures";
import { calculateBalances } from "./ledger";

let serial = 0;
const command = (state: AaSimpleState, cmd: Omit<AaCommand, "expectedVersion" | "operationId">) => applyAaCommand(state, { ...cmd, expectedVersion: state.version, operationId: `test-${++serial}` }, "2026-10-02T12:00:00.000Z");
const balances = (state: AaSimpleState) => Object.fromEntries(simpleBalances(state).map(p => [p.participantId, Number(p.balanceMinor)]));

test("10 / 3 preserves cents, payer first, fixed participant order and outside payer", () => {
  assert.deepEqual(splitSimpleExpense(1000n, "c", ["b", "a", "c"]), [{ participantId: "c", amount: "334" }, { participantId: "b", amount: "333" }, { participantId: "a", amount: "333" }]);
  assert.deepEqual(splitSimpleExpense(1000n, "x", ["b", "a", "c"]).map(r => r.amount), ["334", "333", "333"]);
  assert.deepEqual(splitSimpleExpense(1n, "c", ["b", "a", "c"]).map(r => r.amount), ["1", "0", "0"]);
  assert.throws(() => splitSimpleExpense(10n, "a", ["a", "a"]));
  assert.throws(() => splitSimpleExpense(10n, "a", []));
});

test("PM 51 EUR and prepayments produce Lou refunds of 5 and 2 EUR", () => {
  const state = createAaExample();
  assert.deepEqual(balances(state), { Amy: 200, Kevin: 500, Lou: -700 });
  assert.equal(isPrepaymentRefund(state, "Lou", -700n), true);
  assert.equal(isPrepaymentRefund(state, "Kevin", 500n), false);
  assert.deepEqual(simpleSuggestions(state), [{ from: "Lou", to: "Kevin", amount: "500" }, { from: "Lou", to: "Amy", amount: "200" }]);
  assert.equal(state.records.filter(r => r.type === "EXPENSE").reduce((a, r) => a + BigInt(r.amount), 0n), 5100n);
});

test("refund wording is not used when an ordinary debt remains after removing received prepayments", () => {
  let state = createAaExample("empty");
  state = command(state, { intent: "expense", title: "For Lou", amount: "20.00", payerId: "Kevin", participantIds: ["Lou"] });
  state = command(state, { intent: "prepayment", title: "Advance", amount: "10.00", payerId: "Kevin", recipientId: "Lou" });
  assert.equal(balances(state).Lou, -3000);
  assert.equal(isPrepaymentRefund(state, "Lou", -3000n), false);
});

test("six-person reference and partial payment followed by new expense", () => {
  let state = createAaExample("six");
  assert.deepEqual(balances(state), { Amy: -3077, Kevin: 4223, Lou: 1923, Mike: -416, Tom: -327, Yuki: -2326 });
  assert.deepEqual(simpleSuggestions(state), [
    { from: "Amy", to: "Kevin", amount: "3077" }, { from: "Yuki", to: "Lou", amount: "1923" }, { from: "Mike", to: "Kevin", amount: "416" }, { from: "Yuki", to: "Kevin", amount: "403" }, { from: "Tom", to: "Kevin", amount: "327" },
  ]);
  state = command(state, { intent: "start" });
  const mike = state.records.find(r => r.source === AA_SETTLEMENT && r.from === "Mike")!;
  const others = state.records.filter(r => r.source === AA_SETTLEMENT && r.id !== mike.id);
  state = command({ ...state, viewerId: "Mike", canManage: false }, { intent: "pay", recordId: mike.id });
  assert.equal(state.records.find(r => r.id === mike.id)!.status, "PENDING_CONFIRMATION");
  state = command({ ...state, viewerId: "Kevin", canManage: false }, { intent: "receive", recordId: mike.id });
  assert.deepEqual(state.records.filter(r => r.source === AA_SETTLEMENT && r.id !== mike.id), others);
  state = command({ ...state, viewerId: "Lou", canManage: true }, { intent: "reopen" });
  assert.equal(state.records.find(r => r.id === mike.id)!.status, "POSTED");
  assert.equal(state.records.filter(r => r.source === AA_SETTLEMENT && r.status === "PENDING_CONFIRMATION").length, 0);
  state = command(state, { intent: "expense", title: "打车", amount: "18.00", payerId: "Lou", participantIds: ["Lou", "Amy", "Tom"] });
  assert.deepEqual(balances(state), { Amy: -3677, Kevin: 3807, Lou: 3123, Mike: 0, Tom: -927, Yuki: -2326 });
  assert.deepEqual(simpleSuggestions(state), [
    { from: "Amy", to: "Kevin", amount: "3677" }, { from: "Yuki", to: "Lou", amount: "2326" }, { from: "Tom", to: "Lou", amount: "797" }, { from: "Tom", to: "Kevin", amount: "130" },
  ]);
});

test("payer marks paid, recipient confirms once, stale requests fail and fixed plan is conserved", () => {
  let state = command(createAaExample(), { intent: "start" });
  const payment = state.records.find(r => r.source === AA_SETTLEMENT)!;
  const old = structuredClone(state);
  assert.throws(() => command({ ...state, viewerId: "Amy", canManage: false }, { intent: "pay", recordId: payment.id }), /FORBIDDEN/);
  assert.throws(() => command(state, { intent: "receive", recordId: payment.id }), /FORBIDDEN/);
  state = command(state, { intent: "pay", recordId: payment.id });
  assert.equal(state.records.find(r => r.id === payment.id)!.status, "PENDING_CONFIRMATION");
  assert.equal(state.records.find(r => r.id === payment.id)!.receivedAt, null);
  assert.deepEqual(balances(state), { Amy: 200, Kevin: 500, Lou: -700 });
  assert.deepEqual(command(state, { intent: "pay", recordId: payment.id }), state);
  assert.throws(() => applyAaCommand(state, { intent: "pay", recordId: payment.id, expectedVersion: old.version, operationId: "stale" }, "2026-10-02T12:00:00Z"), /STALE_VERSION/);
  state = command({ ...state, viewerId: "Kevin", canManage: false }, { intent: "receive", recordId: payment.id });
  assert.deepEqual(balances(state), { Amy: 200, Kevin: 0, Lou: -200 });
  assert.equal(state.records.find(r => r.id === payment.id)!.status, "POSTED");
  assert.ok(state.records.find(r => r.id === payment.id)!.receivedAt);
  assert.deepEqual(command(state, { intent: "receive", recordId: payment.id }), state);
  assert.deepEqual(command({ ...state, viewerId: "Lou", canManage: true }, { intent: "pay", recordId: payment.id }).records, state.records);
  assertSimplePlan(state);
});

test("recipient can confirm receipt before payer marks paid", () => {
  let state = command(createAaExample(), { intent: "start" });
  const payment = state.records.find(r => r.source === AA_SETTLEMENT && r.to === "Kevin")!;
  state = command({ ...state, viewerId: "Kevin", canManage: false }, { intent: "receive", recordId: payment.id });
  const confirmed = state.records.find(r => r.id === payment.id)!;
  assert.equal(confirmed.status, "POSTED");
  assert.equal(confirmed.paidAt, null);
  assert.ok(confirmed.receivedAt);
  assert.deepEqual(balances(state), { Amy: 200, Kevin: 0, Lou: -200 });
  assert.deepEqual(command({ ...state, viewerId: "Lou", canManage: true }, { intent: "pay", recordId: payment.id }).records, state.records);
});

test("a marked but unconfirmed payment blocks reopening until the payer undoes the mark", () => {
  let state = command(createAaExample(), { intent: "start" });
  const payment = state.records.find(r => r.source === AA_SETTLEMENT && r.to === "Kevin")!;
  state = command(state, { intent: "pay", recordId: payment.id });
  assert.throws(() => command(state, { intent: "reopen" }), /BLOCKED/);
  assert.throws(() => command({ ...state, viewerId: "Kevin", canManage: false }, { intent: "undoPay", recordId: payment.id }), /FORBIDDEN/);
  state = command(state, { intent: "undoPay", recordId: payment.id });
  assert.equal(state.records.find(r => r.id === payment.id)!.paidAt, null);
  assert.deepEqual(command(state, { intent: "undoPay", recordId: payment.id }), state);
  state = command(state, { intent: "reopen" });
  assert.equal(state.status, "ACTIVE");
});

test("recipient confirmation of an older payer-posted payment keeps its existing balance", () => {
  let state = command(createAaExample(), { intent: "start" });
  const payment = state.records.find(r => r.source === AA_SETTLEMENT && r.to === "Kevin")!;
  state = { ...state, records: state.records.map(r => r.id === payment.id ? { ...r, status: "POSTED", paidAt: "2026-10-02T10:00:00Z" } : r) };
  const before = balances(state);
  state = command({ ...state, viewerId: "Kevin", canManage: false }, { intent: "receive", recordId: payment.id });
  assert.deepEqual(balances(state), before);
  assert.ok(state.records.find(r => r.id === payment.id)!.receivedAt);
});

test("recipient dispute reserves paid money, pauses new payments, resolves without duplicate debit", () => {
  let state = command(createAaExample(), { intent: "start" });
  const payment = state.records.find(r => r.source === AA_SETTLEMENT && r.to === "Kevin")!;
  state = command(state, { intent: "pay", recordId: payment.id });
  state = command({ ...state, viewerId: "Kevin", canManage: false }, { intent: "receive", recordId: payment.id });
  const before = balances(state);
  assert.throws(() => command({ ...state, viewerId: "Lou", canManage: true }, { intent: "dispute", recordId: payment.id }), /FORBIDDEN/);
  state = command({ ...state, viewerId: "Kevin", canManage: false }, { intent: "dispute", recordId: payment.id });
  assert.deepEqual(balances(state), before);
  assert.throws(() => command({ ...state, viewerId: "Lou", canManage: true }, { intent: "reopen" }), /BLOCKED/);
  const verified = command({ ...state, viewerId: "Lou", canManage: true }, { intent: "received", recordId: payment.id });
  assert.deepEqual(balances(verified), before);
  const unpaid = command({ ...state, viewerId: "Lou", canManage: true }, { intent: "unpaid", recordId: payment.id });
  assert.equal(unpaid.status, "ACTIVE");
  assert.deepEqual(balances(unpaid), { Amy: 200, Kevin: 500, Lou: -700 });
});

test("late dispute after re-settlement, then verified unpaid, cancels replacement plan", () => {
  let state = command(createAaExample(), { intent: "start" });
  const payment = state.records.find(r => r.source === AA_SETTLEMENT && r.to === "Kevin")!;
  state = command(state, { intent: "pay", recordId: payment.id });
  state = command({ ...state, viewerId: "Kevin", canManage: false }, { intent: "receive", recordId: payment.id });
  state = command(state, { intent: "reopen" }); state = command(state, { intent: "start" });
  state = command({ ...state, viewerId: "Kevin", canManage: false }, { intent: "dispute", recordId: payment.id });
  assertSimplePlan(state);
  state = command({ ...state, viewerId: "Lou", canManage: true }, { intent: "unpaid", recordId: payment.id });
  assert.equal(state.records.filter(r => r.source === AA_SETTLEMENT && r.status === "PENDING_CONFIRMATION").length, 0);
  assert.deepEqual(simpleSuggestions(state).map(p => p.amount), ["500", "200"]);
});

test("editing, permissions, frozen ledger, invalid decimals, deleted ID, empty book", () => {
  let state = createAaExample("ten"); const record = state.records[0];
  assert.throws(() => command({ ...state, canManage: true, canSettle: false }, { intent: "start" }), /FORBIDDEN/);
  const edit = { intent: "expense" as const, recordId: record.id, title: "晚饭", amount: "11.00", payerId: "Lou", participantIds: ["Lou", "Kevin", "Amy"] };
  assert.throws(() => command({ ...state, viewerId: "Kevin", canManage: false }, edit), /FORBIDDEN/);
  assert.throws(() => command(state, { ...edit, amount: "1.005" }), /TOO_MANY_DECIMALS/);
  assert.throws(() => command(state, { ...edit, participantIds: ["unknown"] }), /INVALID_PARTICIPANTS/);
  assert.throws(() => command(command(state, { intent: "start" }), edit), /LOCKED/);
  state = command(state, edit); assert.equal(state.records.length, 1); assert.equal(state.records[0].amount, "1100");
  state = command(state, { intent: "delete", recordId: record.id });
  assert.throws(() => command(state, edit), /INVALID_RECORD/);
  assert.throws(() => command(createAaExample("empty"), { intent: "start" }), /EMPTY_LEDGER/);
  assert.throws(() => command({ ...createAaExample(), legacyBlocked: true }, { intent: "start" }), /BLOCKED/);
});

test("deleted expenses after paid settlement still generate reversal refunds", () => {
  let state = command(createAaExample("ten"), { intent: "start" });
  const expense = state.records[0];
  for (const r of state.records.filter(r => r.source === AA_SETTLEMENT)) state = command({ ...state, viewerId: r.to!, canManage: false }, { intent: "receive", recordId: r.id });
  state = command({ ...state, viewerId: "Lou", canManage: true }, { intent: "reopen" });
  state = command(state, { intent: "delete", recordId: expense.id });
  state = command(state, { intent: "start" });
  assert.deepEqual(simpleSuggestions(state), [{ from: "Lou", to: "Kevin", amount: "333" }, { from: "Lou", to: "Amy", amount: "333" }]);
});

test("negative, duplicate, unknown allocations fail closed", () => {
  const base = { id: "bad", type: "EXPENSE" as const, status: "POSTED" as const, baseAmountMinor: 100n, contributions: [{ participantId: "a", amountMinor: 100n }], shares: [{ participantId: "a", amountMinor: -100n }, { participantId: "b", amountMinor: 200n }] };
  assert.throws(() => calculateBalances(["a", "b"], [base]), /NEGATIVE_ALLOCATION/);
  assert.throws(() => calculateBalances(["a"], [{ ...base, shares: [{ participantId: "b", amountMinor: 100n }] }]), /UNKNOWN_PARTICIPANT/);
});

test("10,000 varied splits and plans conserve cents, have no self transfers, and settle to zero", () => {
  let seed = 187;
  const random = (max: number) => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed % max; };
  for (let i = 0; i < 10000; i++) {
    let state = createAaExample("empty");
    const ids = state.participants.map(p => p.id);
    const amount = BigInt(random(1000000) + 1);
    const chosen = ids.filter(() => random(3) !== 0); if (!chosen.length) chosen.push(ids[0]);
    state = command(state, { intent: "expense", title: "Random", amount: `${amount / 100n}.${String(amount % 100n).padStart(2, "0")}`, payerId: ids[random(3)], participantIds: chosen });
    assert.equal(state.records[0].shares.reduce((sum, s) => sum + BigInt(s.amount), 0n), amount);
    const plan = simpleSuggestions(state);
    assert.ok(plan.length <= 2);
    state = command(state, { intent: "start" });
    for (const payment of state.records.filter(r => r.source === AA_SETTLEMENT)) {
      assert.notEqual(payment.from, payment.to); assert.ok(BigInt(payment.amount) > 0n);
      state = command({ ...state, viewerId: payment.to!, canManage: false }, { intent: "receive", recordId: payment.id });
    }
    assert.ok(simpleBalances(state).every(p => p.balanceMinor === 0n));
  }
});
