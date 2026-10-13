import type { Prisma } from "@prisma/client";
import { AUTO_CREATED_TEAM_SOURCE } from "./autoCreatedTeams";
import { isAddressPrivacyOnlySourcePayload } from "./activityAddressPrivacy";

const legacyPublicActivityIdPattern =
  /^(playinparis|sortiraparis|paris-opendata|paris_open_data|feverup)_/i;
export const legacyPublicActivitySources = [
  "playinparis",
  "playinparis.com",
  "sortiraparis",
  "sortiraparis.com",
  "paris-opendata",
  "paris-opendata:que-faire-a-paris",
  "opendata.paris.fr",
  "feverup",
  "feverup.com",
];

function includesKnownPublicActivitySource(value: string | null | undefined) {
  const normalizedValue = value?.trim().toLowerCase();

  if (!normalizedValue) {
    return false;
  }

  return legacyPublicActivitySources.some((knownSource) =>
    normalizedValue.includes(knownSource),
  );
}

export function isLegacyActivityInfoSource(activity: {
  id?: string | null;
  publicEventId?: string | null;
  source?: string | null;
  sourceUrl?: string | null;
  externalSource?: string | null;
  externalId?: string | null;
  externalUrl?: string | null;
  importedAt?: Date | string | null;
  sourcePayload?: unknown;
}) {
  if (
    activity.source === AUTO_CREATED_TEAM_SOURCE ||
    activity.source === "MERCHANT_BOOKING"
  ) {
    return false;
  }

  if (activity.publicEventId) {
    return false;
  }

  const sourceLooksPublic =
    Boolean(activity.id && legacyPublicActivityIdPattern.test(activity.id)) ||
    includesKnownPublicActivitySource(activity.source) ||
    includesKnownPublicActivitySource(activity.sourceUrl) ||
    includesKnownPublicActivitySource(activity.externalUrl);

  const sourcePayloadLooksPublic = Boolean(
    activity.sourcePayload &&
    !isAddressPrivacyOnlySourcePayload(
      activity.sourcePayload as Prisma.JsonValue,
    ),
  );

  return Boolean(
    sourceLooksPublic ||
    activity.externalSource ||
    activity.externalId ||
    activity.externalUrl ||
    activity.importedAt ||
    sourcePayloadLooksPublic,
  );
}
