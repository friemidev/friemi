export const initialTrustScore = 95;
export const lowTrustScoreThreshold = 60;

export type TrustLevel =
  | "TRUSTED"
  | "VERIFIED"
  | "BUILDING_TRUST"
  | "WARNING"
  | "RESTRICTED";

export function clampTrustScore(score: number) {
  return Math.max(0, Math.min(100, score));
}

export function calculateTrustScore(deltaSum: number | null | undefined) {
  const score = initialTrustScore + (deltaSum ?? 0);

  return clampTrustScore(Math.round(score * 10) / 10);
}

export function isLowTrustScore(score: number) {
  return score < lowTrustScoreThreshold;
}

export function canCreateActivityWithTrustScore(score: number) {
  return !isLowTrustScore(score);
}

export function getActivityCreationTrustRestrictionMessage(locale: string) {
  if (locale === "fr") {
    return "Un score de confiance d'au moins 60 est requis pour créer une sortie.";
  }

  if (locale === "en") {
    return "A trust score of at least 60 is required to create a plan.";
  }

  return "信用分低于 60 时不能创建聚吧。";
}

export function isActivityEndedForTrustSettlement(
  activity: {
    endAt: Date | null;
    startAt: Date;
    status: string;
  },
  now = new Date(),
) {
  if (activity.status === "CANCELLED") {
    return false;
  }

  return (
    activity.status === "ENDED" ||
    (activity.endAt ?? activity.startAt).getTime() <= now.getTime()
  );
}

export function getTrustLevel(score: number): TrustLevel {
  if (score >= 90) {
    return "TRUSTED";
  }

  if (score >= 80) {
    return "VERIFIED";
  }

  if (score >= 60) {
    return "BUILDING_TRUST";
  }

  if (score >= 30) {
    return "WARNING";
  }

  return "RESTRICTED";
}

export function getTrustLevelLabel(score: number, locale: string) {
  const level = getTrustLevel(score);

  if (locale === "fr") {
    return {
      TRUSTED: "Trusted",
      VERIFIED: "Verified",
      BUILDING_TRUST: "En construction",
      WARNING: "Warning",
      RESTRICTED: "Restricted",
    }[level];
  }

  if (locale === "en") {
    return {
      TRUSTED: "Trusted",
      VERIFIED: "Verified",
      BUILDING_TRUST: "Building trust",
      WARNING: "Warning",
      RESTRICTED: "Restricted",
    }[level];
  }

  return {
    TRUSTED: "Trusted",
    VERIFIED: "Verified",
    BUILDING_TRUST: "建立信用中",
    WARNING: "Warning",
    RESTRICTED: "Restricted",
  }[level];
}
