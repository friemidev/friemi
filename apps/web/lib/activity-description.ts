import { MAX_ACTIVITY_DESCRIPTION_LENGTH } from "@/features/activities/schemas/activitySchema";

const SOURCE_LABELS = [
  "来源链接",
  "Source link",
  "Lien source",
] as const;

function truncateToLength(value: string, maxLength: number) {
  if (value.length <= maxLength) {
    return value;
  }

  if (maxLength <= 1) {
    return "…";
  }

  return `${value.slice(0, maxLength - 1)}…`;
}

export function stripDescriptionSourceSuffix(
  description: string,
  sourceLabels: readonly string[] = SOURCE_LABELS,
) {
  let normalized = description.trimEnd();

  for (const label of sourceLabels) {
    const pattern = new RegExp(`\\n*${label}\\s*:\\s*https?:\\/\\/\\S+\\s*$`, "i");

    normalized = normalized.replace(pattern, "").trimEnd();
  }

  return normalized;
}

export function buildActivityDescriptionWithSource({
  body,
  fallbackDescription,
  maxLength = MAX_ACTIVITY_DESCRIPTION_LENGTH,
  sourceLabel,
  sourceUrl,
}: {
  body: string;
  fallbackDescription: string;
  maxLength?: number;
  sourceLabel: string;
  sourceUrl: string;
}) {
  const sourceSuffix = `\n\n${sourceLabel}: ${sourceUrl}`;
  const normalizedBody =
    stripDescriptionSourceSuffix(body, [sourceLabel, ...SOURCE_LABELS]) ||
    fallbackDescription;
  const maxBodyLength = Math.max(0, maxLength - sourceSuffix.length);
  const trimmedBody = truncateToLength(normalizedBody, maxBodyLength);
  const result = `${trimmedBody}${sourceSuffix}`;

  if (result.length <= maxLength) {
    return result;
  }

  const overflow = result.length - maxLength;
  const shorterBody = truncateToLength(
    trimmedBody,
    Math.max(0, trimmedBody.length - overflow),
  );

  return `${shorterBody}${sourceSuffix}`;
}

export function clampActivityDescription(
  description: string,
  maxLength = MAX_ACTIVITY_DESCRIPTION_LENGTH,
) {
  const trimmed = description.trim();

  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  for (const label of SOURCE_LABELS) {
    const pattern = new RegExp(`(\\n*${label}\\s*:\\s*https?:\\/\\/\\S+)\\s*$`, "i");
    const match = trimmed.match(pattern);

    if (match) {
      const suffix = match[1];
      const maxBodyLength = Math.max(0, maxLength - suffix.length);
      const body = stripDescriptionSourceSuffix(trimmed, [label, ...SOURCE_LABELS]);

      return `${truncateToLength(body, maxBodyLength)}${suffix}`;
    }
  }

  return truncateToLength(trimmed, maxLength);
}
