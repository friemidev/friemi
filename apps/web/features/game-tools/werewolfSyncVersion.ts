import { getPerformanceRolloutMode } from "@/lib/performanceRollouts";

export type WerewolfDerivedVersionInput = {
  finishedAt: Date | null;
  latestEvent: { createdAt: Date; id: string } | null;
  startedAt: Date | null;
  status: string;
  updatedAt: Date;
};

export function buildWerewolfDerivedSyncVersion({
  finishedAt,
  latestEvent,
  startedAt,
  status,
  updatedAt,
}: WerewolfDerivedVersionInput) {
  return [
    status,
    updatedAt.toISOString(),
    startedAt?.toISOString() ?? "",
    finishedAt?.toISOString() ?? "",
    latestEvent?.id ?? "",
    latestEvent?.createdAt.toISOString() ?? "",
  ].join(":");
}

export function buildWerewolfRevisionSyncVersion({
  revision,
  status,
}: {
  revision: number;
  status: string;
}) {
  return `${status}:r${revision}`;
}

export function getWerewolfSyncVersion({
  derived,
  revision,
  roomId,
  status,
}: {
  derived: string;
  revision: number;
  roomId: string;
  status: string;
}) {
  const mode = getPerformanceRolloutMode("werewolfRevision", roomId);

  return {
    mode,
    source: mode === "canary" ? ("revision" as const) : ("derived" as const),
    value:
      mode === "canary"
        ? buildWerewolfRevisionSyncVersion({ revision, status })
        : derived,
  };
}
