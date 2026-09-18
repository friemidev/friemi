import type { ActivityPollKind, ActivityPollStatus } from "@prisma/client";

export const MIN_POLL_OPTIONS = 2;
export const MAX_POLL_OPTIONS = 20;
export const DEFAULT_POLL_RESULT_VISIBILITY = "AFTER_VOTE" as const;
export const DEFAULT_POLL_VOTER_VISIBILITY = "PARTICIPANTS_VISIBLE" as const;
export const POLL_GUEST_IDENTITY_MODE = "NICKNAME_REQUIRED" as const;

export function normalizePollOptions(values: string[]) {
  const seen = new Set<string>();
  const options: string[] = [];

  for (const value of values) {
    const normalized = value.replace(/\s+/g, " ").trim().slice(0, 80);
    const comparison = normalized.toLocaleLowerCase();

    if (!normalized || seen.has(comparison)) continue;
    seen.add(comparison);
    options.push(normalized);
  }

  return options;
}

export function resolveEffectivePollStatus(
  status: ActivityPollStatus,
  closesAt: Date | null,
  now = new Date(),
) {
  if (status === "OPEN" && closesAt && closesAt <= now) {
    return "CLOSED" as const;
  }

  return status;
}

export function isValidPollSelection({
  kind,
  maxSelections,
  optionCount,
  selectedCount,
}: {
  kind: ActivityPollKind;
  maxSelections: number | null;
  optionCount: number;
  selectedCount: number;
}) {
  if (selectedCount < 1 || selectedCount > optionCount) return false;
  if (kind === "SINGLE_CHOICE") return selectedCount === 1;

  return selectedCount <= (maxSelections ?? optionCount);
}
