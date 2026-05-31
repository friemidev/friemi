import { parseParisDateTime } from "@/features/activities/actions/activityActionUtils";
import {
  hashActivityFingerprint,
  normalizeActivitySourceUrl,
  type ActivityDuplicateHint,
} from "@/lib/activity-dedupe";
import { prisma } from "@/lib/prisma";
import type { ActivityLinkPreview } from "./parseActivityLink";

async function findBySourceUrl(
  sourceUrl: string,
): Promise<ActivityDuplicateHint | null> {
  const normalizedUrl = normalizeActivitySourceUrl(sourceUrl);
  const urlCandidates = [normalizedUrl, sourceUrl.trim()].filter(
    (value, index, list) => value && list.indexOf(value) === index,
  );

  const byActivity = await prisma.activity.findFirst({
    where: {
      sourceUrl: {
        in: urlCandidates,
      },
    },
    select: {
      id: true,
      startAt: true,
      title: true,
    },
  });

  if (byActivity) {
    return {
      activityId: byActivity.id,
      startAt: byActivity.startAt.toISOString(),
      status: "same_url",
      title: byActivity.title,
    };
  }

  const bySourceLink = await prisma.activitySourceLink.findFirst({
    where: {
      sourceUrl: {
        in: urlCandidates,
      },
    },
    select: {
      activity: {
        select: {
          id: true,
          startAt: true,
          title: true,
        },
      },
    },
  });

  if (bySourceLink?.activity) {
    return {
      activityId: bySourceLink.activity.id,
      startAt: bySourceLink.activity.startAt.toISOString(),
      status: "same_url",
      title: bySourceLink.activity.title,
    };
  }

  return null;
}

async function findByFingerprint(
  title: string,
  startAtInput: string,
  address: string,
  excludeActivityId?: string,
): Promise<ActivityDuplicateHint | null> {
  const startAt = parseParisDateTime(startAtInput);

  if (!startAt) {
    return null;
  }

  const fingerprint = hashActivityFingerprint(
    title,
    startAt.toISOString(),
    address,
  );

  const candidates = await prisma.activity.findMany({
    where: {
      startAt,
      ...(excludeActivityId ? { NOT: { id: excludeActivityId } } : {}),
    },
    select: {
      address: true,
      id: true,
      startAt: true,
      title: true,
    },
    take: 50,
  });

  const match = candidates.find(
    (activity) =>
      hashActivityFingerprint(
        activity.title,
        activity.startAt.toISOString(),
        activity.address,
      ) === fingerprint,
  );

  if (!match) {
    return null;
  }

  return {
    activityId: match.id,
    startAt: match.startAt.toISOString(),
    status: "similar",
    title: match.title,
  };
}

export async function findActivityDuplicateHint(
  preview: ActivityLinkPreview,
): Promise<ActivityDuplicateHint | null> {
  const sameUrl = await findBySourceUrl(preview.sourceUrl);

  if (sameUrl) {
    return sameUrl;
  }

  const { title, startAt, address } = preview.values;

  if (!title?.trim() || !startAt?.trim() || !address?.trim()) {
    return null;
  }

  return findByFingerprint(title, startAt, address);
}
