import { createHash } from "node:crypto";

export type ActivityDuplicateHintStatus = "same_url" | "similar";

export type ActivityDuplicateHint = {
  activityId: string;
  startAt: string;
  status: ActivityDuplicateHintStatus;
  title: string;
};

export function normalizeActivitySourceUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl.trim());

    for (const key of [
      "aff",
      "affiliate",
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_content",
      "utm_term",
    ]) {
      url.searchParams.delete(key);
    }

    url.hash = "";

    return url.toString();
  } catch {
    return rawUrl.trim();
  }
}

export function hashActivityFingerprint(
  title: string,
  startAtIso: string,
  address: string,
) {
  return createHash("sha1")
    .update(
      `${title.trim().toLowerCase()}|${startAtIso}|${address.trim().toLowerCase()}`,
    )
    .digest("hex");
}
