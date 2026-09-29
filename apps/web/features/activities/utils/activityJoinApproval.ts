export function resolveJoinParticipantStatus({
  requiresApproval,
}: {
  requiresApproval: boolean;
}) {
  return requiresApproval ? ("PENDING" as const) : ("APPROVED" as const);
}
