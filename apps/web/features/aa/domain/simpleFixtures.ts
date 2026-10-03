import { applyAaCommand, type AaCommand, type AaSimpleState } from "./simpleLedger";

export function createAaExample(kind: "fund" | "ten" | "six" | "empty" = "fund"): AaSimpleState {
  const names = kind === "six" ? ["Lou", "Kevin", "Amy", "Tom", "Yuki", "Mike"] : ["Lou", "Kevin", "Amy"];
  let state: AaSimpleState = {
    id: "local-preview", activityId: "local-preview", title: "周末朋友小聚", currency: "EUR", version: 1,
    status: "ACTIVE", startedAt: null, viewerId: "Lou", canManage: true, canSettle: true, legacyBlocked: false,
    participants: names.map(id => ({ id, name: id, active: true })), records: [],
  };
  let index = 0;
  const add = (command: Omit<AaCommand, "operationId" | "expectedVersion">) => {
    state = applyAaCommand(state, { ...command, operationId: `fixture-${++index}`, expectedVersion: state.version }, "2026-10-02T10:00:00.000Z");
  };
  const expense = (title: string, amount: string, payerId: string, participantIds = names) => add({ intent: "expense", title, amount, payerId, participantIds });
  const prepay = (payerId: string, amount: string) => add({ intent: "prepayment", title: "过程中转账", payerId, recipientId: "Lou", amount });
  if (kind === "fund") {
    expense("晚饭", "36.00", "Lou"); expense("酒", "9.00", "Lou"); expense("饮料", "6.00", "Lou", ["Lou", "Amy"]);
    prepay("Kevin", "20.00"); prepay("Amy", "20.00");
  } else if (kind === "ten") expense("三人分 €10", "10.00", "Lou");
  else if (kind === "six") {
    expense("场地", "120.00", "Lou"); expense("晚饭", "95.50", "Kevin", names.filter(n => n !== "Mike"));
    expense("酒", "50.00", "Tom", ["Tom", "Kevin", "Mike", "Yuki"]); expense("饮料", "10.00", "Amy");
    prepay("Yuki", "30.00"); prepay("Mike", "30.00");
  }
  return state;
}
