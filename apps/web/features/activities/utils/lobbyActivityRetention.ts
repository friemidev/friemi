import type { Prisma } from "@prisma/client";
import type { ActivityCardViewModel } from "../types";
import {
  getActivityEndBoundary,
  getActivityFloatingNow,
} from "./activityDisplay";

export const lobbyEndedRetentionMs = 3 * 24 * 60 * 60 * 1000;

export function isArchivedLobbyActivity(
  activity: ActivityCardViewModel,
  reference = new Date(),
) {
  if (activity.isPersistent) return false;
  if (activity.status === "CANCELLED") return true;
  const now =
    activity.type === "PUBLIC_EVENT"
      ? reference
      : getActivityFloatingNow(reference);
  return (
    getActivityEndBoundary(activity).getTime() + lobbyEndedRetentionMs <=
    now.getTime()
  );
}

// Lobby buckets are independent of the actual ended status and join permissions.
export function getLobbyRetentionWhere(
  archived: boolean,
  reference = new Date(),
): Prisma.ActivityWhereInput {
  const cutoff = new Date(
    getActivityFloatingNow(reference).getTime() - lobbyEndedRetentionMs,
  );
  const cutoffDay = new Date(
    Date.UTC(
      cutoff.getUTCFullYear(),
      cutoff.getUTCMonth(),
      cutoff.getUTCDate(),
    ),
  );

  if (archived) {
    return {
      isPersistent: false,
      OR: [
        { status: "CANCELLED" },
        { endAt: { lte: cutoff } },
        { endAt: null, startAt: { lt: cutoffDay } },
      ],
    };
  }

  return {
    status: { not: "CANCELLED" },
    OR: [
      { isPersistent: true },
      { endAt: { gt: cutoff } },
      { endAt: null, startAt: { gte: cutoffDay } },
    ],
  };
}
