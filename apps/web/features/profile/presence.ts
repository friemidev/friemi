import type { UserPresenceStatus } from "@prisma/client";

export const userPresenceStatuses = [
  "ONLINE",
  "AWAY",
  "INVISIBLE",
] as const satisfies readonly UserPresenceStatus[];

export type UserPresenceStatusValue = (typeof userPresenceStatuses)[number];

export const presenceOnlineWindowMs = 5 * 60 * 1000;

const fallbackPresenceStatus: UserPresenceStatusValue = "ONLINE";

export function normalizeUserPresenceStatus(
  value: unknown,
): UserPresenceStatusValue {
  return userPresenceStatuses.includes(value as UserPresenceStatusValue)
    ? (value as UserPresenceStatusValue)
    : fallbackPresenceStatus;
}

export function getUserPresenceState({
  lastActiveAt,
  now = new Date(),
  status,
}: {
  lastActiveAt: Date | string | null | undefined;
  now?: Date;
  status: string | null | undefined;
}) {
  const normalizedStatus = normalizeUserPresenceStatus(status);
  const activeAt =
    lastActiveAt instanceof Date
      ? lastActiveAt
      : lastActiveAt
        ? new Date(lastActiveAt)
        : null;
  const activeTime = activeAt?.getTime() ?? Number.NaN;
  const ageMs = now.getTime() - activeTime;
  const isRecentlyActive =
    Number.isFinite(activeTime) && ageMs >= 0 && ageMs <= presenceOnlineWindowMs;

  return {
    status: normalizedStatus,
    isOnline: normalizedStatus === "ONLINE" && isRecentlyActive,
  };
}

export function getPresenceCopy(locale: string) {
  if (locale === "fr") {
    return {
      label: "Statut",
      saved: "Statut mis a jour",
      statuses: {
        ONLINE: "En ligne",
        AWAY: "Absent",
        INVISIBLE: "Invisible",
      },
    };
  }

  if (locale === "en") {
    return {
      label: "Status",
      saved: "Status updated",
      statuses: {
        ONLINE: "Online",
        AWAY: "Away",
        INVISIBLE: "Invisible",
      },
    };
  }

  return {
    label: "状态",
    saved: "状态已更新",
    statuses: {
      ONLINE: "在线",
      AWAY: "暂离",
      INVISIBLE: "隐身",
    },
  };
}
