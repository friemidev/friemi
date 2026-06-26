import type { Prisma } from "@prisma/client";

export const AUTO_CREATED_TEAM_SOURCE = "AUTO_HOT_ACTIVITY_TEAM";
export const AUTO_CREATED_TEAM_DAILY_LINK_SOURCE = "auto_hot_activity_daily";
export const AUTO_CREATED_TEAM_VIEW_THRESHOLD = 1;
export const AUTO_CREATED_TEAM_FAVORITE_THRESHOLD = 0;
export const AUTO_CREATED_TEAM_WINDOW_DAYS = 7;
export const AUTO_CREATED_TEAM_DAILY_LIMIT = 3;
export const AUTO_CREATED_TEAM_CLAIM_WINDOW_HOURS = 24;

type JsonRecord = Record<string, Prisma.JsonValue>;

export type AutoCreatedTeamMetadata = {
  autoCreatedAt: string | null;
  claimableUntil: string | null;
  claimedAt: string | null;
  claimedByUserProfileId: string | null;
  sourceActivityId: string | null;
  sourceActivityTitle: string | null;
};

export function buildAutoCreatedTeamDailyLink(sourceActivityId: string, dateKey: string) {
  return `auto-hot-activity:${sourceActivityId}:${dateKey}`;
}

export function getParisDateKey(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function buildAutoCreatedTeamMetadata(input: {
  claimableUntil: Date;
  sourceActivityId: string;
  sourceActivityTitle: string;
}) {
  return {
    autoCreatedAt: new Date().toISOString(),
    claimableUntil: input.claimableUntil.toISOString(),
    claimedAt: null,
    claimedByUserProfileId: null,
    sourceActivityId: input.sourceActivityId,
    sourceActivityTitle: input.sourceActivityTitle,
  } satisfies Prisma.InputJsonValue;
}

function toJsonRecord(value: Prisma.JsonValue | null | undefined): JsonRecord | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as JsonRecord;
}

function getNullableStringValue(record: JsonRecord | null, key: keyof AutoCreatedTeamMetadata) {
  const value = record?.[key];
  return typeof value === "string" ? value : null;
}

export function getAutoCreatedTeamMetadata(
  source: string | null | undefined,
  sourcePayload: Prisma.JsonValue | null | undefined,
): AutoCreatedTeamMetadata | null {
  if (source !== AUTO_CREATED_TEAM_SOURCE) {
    return null;
  }

  const record = toJsonRecord(sourcePayload);

  return {
    autoCreatedAt: getNullableStringValue(record, "autoCreatedAt"),
    claimableUntil: getNullableStringValue(record, "claimableUntil"),
    claimedAt: getNullableStringValue(record, "claimedAt"),
    claimedByUserProfileId: getNullableStringValue(record, "claimedByUserProfileId"),
    sourceActivityId: getNullableStringValue(record, "sourceActivityId"),
    sourceActivityTitle: getNullableStringValue(record, "sourceActivityTitle"),
  };
}

export function isAutoCreatedTeamClaimable(metadata: AutoCreatedTeamMetadata | null, now = new Date()) {
  if (!metadata || metadata.claimedAt) {
    return false;
  }

  if (!metadata.claimableUntil) {
    return false;
  }

  return new Date(metadata.claimableUntil) > now;
}
