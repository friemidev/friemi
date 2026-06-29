import type { Prisma } from "@prisma/client";

const addressPrivacyKey = "addressPrivacy";

type JsonRecord = Record<string, Prisma.JsonValue>;

function toJsonRecord(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {} as JsonRecord;
  }

  return value as JsonRecord;
}

function getNestedRecord(value: Prisma.JsonValue | null | undefined) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as JsonRecord;
}

export function getActivityAddressPrivacy(
  sourcePayload: Prisma.JsonValue | null | undefined,
) {
  const record = toJsonRecord(sourcePayload);
  const privacy = getNestedRecord(record[addressPrivacyKey]);

  return {
    hideFromNonParticipants:
      privacy?.hideFromNonParticipants === true ||
      record.hideAddressFromNonParticipants === true,
  };
}

export function isAddressPrivacyOnlySourcePayload(
  sourcePayload: Prisma.JsonValue | null | undefined,
) {
  const record = toJsonRecord(sourcePayload);
  const keys = Object.keys(record);

  return (
    keys.length > 0 &&
    keys.every(
      (key) => key === addressPrivacyKey || key === "hideAddressFromNonParticipants",
    )
  );
}

export function mergeActivityAddressPrivacy(
  sourcePayload: Prisma.JsonValue | null | undefined,
  hideFromNonParticipants: boolean,
) {
  return {
    ...toJsonRecord(sourcePayload),
    [addressPrivacyKey]: {
      hideFromNonParticipants,
    },
  } satisfies Prisma.InputJsonObject;
}

export function shouldHideActivityAddressFromViewer({
  isActivityInfo,
  isViewerParticipant,
  organizerId,
  sourcePayload,
  viewerProfileId,
}: {
  isActivityInfo?: boolean;
  isViewerParticipant: boolean;
  organizerId?: string | null;
  sourcePayload: Prisma.JsonValue | null | undefined;
  viewerProfileId?: string | null;
}) {
  if (isActivityInfo) {
    return false;
  }

  if (!getActivityAddressPrivacy(sourcePayload).hideFromNonParticipants) {
    return false;
  }

  if (viewerProfileId && viewerProfileId === organizerId) {
    return false;
  }

  return !isViewerParticipant;
}
