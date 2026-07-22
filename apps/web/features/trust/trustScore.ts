export const initialTrustScore = 80;
export const lowTrustScoreThreshold = 60;
export const largeActivityCapacityThreshold = 15;

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
  return clampTrustScore(initialTrustScore + (deltaSum ?? 0));
}

export function isLowTrustScore(score: number) {
  return score < lowTrustScoreThreshold;
}

export function isLargeActivityCapacity(capacity: number | null | undefined) {
  return Number(capacity ?? 0) >= largeActivityCapacityThreshold;
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
