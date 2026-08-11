import { getUserProfileRemarkDelegate } from "@/lib/prisma";

export const maxProfileRemarkNameLength = 32;

export function normalizeProfileRemarkName(value: FormDataEntryValue | null) {
  if (typeof value !== "string") {
    return "";
  }

  return value.replace(/\s+/g, " ").trim();
}

export function resolveRemarkedProfileName({
  publicNickname,
  remarkName,
}: {
  publicNickname: string;
  remarkName?: string | null;
}) {
  const normalizedRemark = remarkName?.trim() ?? "";

  return normalizedRemark || publicNickname;
}

export function isMissingProfileRemarkStorageError(error: unknown) {
  if (!error || typeof error !== "object" || !("code" in error)) {
    return false;
  }

  return error.code === "P2021" || error.code === "P2022";
}

export async function getProfileRemarkName({
  ownerProfileId,
  targetProfileId,
}: {
  ownerProfileId?: string | null;
  targetProfileId: string;
}) {
  if (!ownerProfileId || ownerProfileId === targetProfileId) {
    return null;
  }

  const userProfileRemark = getUserProfileRemarkDelegate();

  if (!userProfileRemark) {
    return null;
  }

  try {
    const remark = await userProfileRemark.findUnique({
      where: {
        ownerId_targetId: {
          ownerId: ownerProfileId,
          targetId: targetProfileId,
        },
      },
      select: {
        remarkName: true,
      },
    });

    return remark?.remarkName ?? null;
  } catch (error) {
    if (isMissingProfileRemarkStorageError(error)) {
      return null;
    }

    throw error;
  }
}

export async function getProfileRemarkMap({
  ownerProfileId,
  targetProfileIds,
}: {
  ownerProfileId?: string | null;
  targetProfileIds: string[];
}) {
  if (!ownerProfileId) {
    return new Map<string, string>();
  }

  const uniqueTargetIds = [...new Set(targetProfileIds)].filter(
    (targetId) => targetId && targetId !== ownerProfileId,
  );

  if (uniqueTargetIds.length === 0) {
    return new Map<string, string>();
  }

  const userProfileRemark = getUserProfileRemarkDelegate();

  if (!userProfileRemark) {
    return new Map<string, string>();
  }

  try {
    const remarks = await userProfileRemark.findMany({
      where: {
        ownerId: ownerProfileId,
        targetId: {
          in: uniqueTargetIds,
        },
      },
      select: {
        targetId: true,
        remarkName: true,
      },
    });

    return new Map(
      remarks.map((remark) => [remark.targetId, remark.remarkName]),
    );
  } catch (error) {
    if (isMissingProfileRemarkStorageError(error)) {
      return new Map<string, string>();
    }

    throw error;
  }
}
