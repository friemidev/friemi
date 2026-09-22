export function partitionActivityAttendance({
  absentParticipationIds,
  participantIds,
}: {
  absentParticipationIds: string[];
  participantIds: string[];
}) {
  const participantIdSet = new Set(participantIds);
  const absentIdSet = new Set(
    absentParticipationIds.filter((id) => participantIdSet.has(id)),
  );

  return {
    absentIds: participantIds.filter((id) => absentIdSet.has(id)),
    presentIds: participantIds.filter((id) => !absentIdSet.has(id)),
  };
}
