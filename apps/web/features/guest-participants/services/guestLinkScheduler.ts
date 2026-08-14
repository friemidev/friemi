import { createHash } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import {
  normalizeGuestEmail,
  normalizeGuestPhone,
  normalizeGuestWechatId,
} from "../utils/contactIdentity";
import {
  countGuestLinkCandidatesForProfile,
  linkGuestParticipationsForProfile,
} from "./linkGuestParticipations";
import {
  getPerformanceRolloutMode,
  logPerformanceShadow,
} from "@/lib/performanceRollouts";

const guestLinkMinimumRecheckMs = 24 * 60 * 60 * 1000;

export type GuestLinkProfile = {
  contactEmail?: string | null;
  email?: string | null;
  emailVerifiedAt?: Date | string | null;
  guestLinkCheckedAt?: Date | string | null;
  guestLinkFingerprint?: string | null;
  id: string;
  normalizedContactEmail?: string | null;
  normalizedPhone?: string | null;
  normalizedWechatId?: string | null;
  phone?: string | null;
  verifiedEmail?: string | null;
  wechatId?: string | null;
};

export type GuestLinkTrigger =
  | "auth_snapshot"
  | "clerk_webhook"
  | "contact_binding"
  | "reconciliation";

function getNormalizedGuestLinkIdentities(profile: GuestLinkProfile) {
  return [
    profile.normalizedContactEmail ?? normalizeGuestEmail(profile.contactEmail),
    normalizeGuestEmail(
      profile.verifiedEmail ?? (profile.emailVerifiedAt ? profile.email : null),
    ),
    profile.normalizedPhone ?? normalizeGuestPhone(profile.phone),
    profile.normalizedWechatId ?? normalizeGuestWechatId(profile.wechatId),
  ]
    .filter(Boolean)
    .sort() as string[];
}

export function buildGuestLinkFingerprint(profile: GuestLinkProfile) {
  const identities = getNormalizedGuestLinkIdentities(profile);

  if (identities.length === 0) {
    return null;
  }

  return createHash("sha256").update(identities.join("\n")).digest("hex");
}

export function shouldCheckGuestLinks({
  fingerprint,
  lastCheckedAt,
  previousFingerprint,
  now = new Date(),
}: {
  fingerprint: string | null;
  lastCheckedAt?: Date | string | null;
  now?: Date;
  previousFingerprint?: string | null;
}) {
  if (!fingerprint) {
    return false;
  }

  if (fingerprint !== previousFingerprint || !lastCheckedAt) {
    return true;
  }

  return (
    now.getTime() - new Date(lastCheckedAt).getTime() >=
    guestLinkMinimumRecheckMs
  );
}

async function claimGuestLinkCheck(
  prisma: PrismaClient,
  profile: GuestLinkProfile,
  fingerprint: string,
  now: Date,
  force: boolean,
) {
  const staleBefore = new Date(now.getTime() - guestLinkMinimumRecheckMs);
  const claimed = await prisma.userProfile.updateMany({
    where: {
      id: profile.id,
      ...(force
        ? {}
        : {
            OR: [
              { guestLinkFingerprint: null },
              { guestLinkFingerprint: { not: fingerprint } },
              { guestLinkCheckedAt: null },
              { guestLinkCheckedAt: { lte: staleBefore } },
            ],
          }),
    },
    data: {
      guestLinkCheckedAt: now,
      guestLinkFingerprint: fingerprint,
    },
  });

  return claimed.count === 1;
}

export async function runScheduledGuestLink({
  force = false,
  prisma,
  profile,
  trigger,
}: {
  force?: boolean;
  prisma: PrismaClient;
  profile: GuestLinkProfile;
  trigger: GuestLinkTrigger;
}) {
  const startedAt = Date.now();
  const fingerprint = buildGuestLinkFingerprint(profile);

  if (!fingerprint) {
    return { activityIds: [], linked: 0, skipped: true };
  }

  const mode = getPerformanceRolloutMode("guestLink", profile.id);
  const due = shouldCheckGuestLinks({
    fingerprint,
    lastCheckedAt: profile.guestLinkCheckedAt,
    previousFingerprint: profile.guestLinkFingerprint,
  });

  if (mode === "shadow") {
    const candidateCount = await countGuestLinkCandidatesForProfile(
      prisma,
      profile,
    );
    const result = await linkGuestParticipationsForProfile(prisma, profile);

    logPerformanceShadow("b1_guest_link", {
      candidateCount,
      durationMs: Date.now() - startedAt,
      due,
      linked: result.linked,
      mode,
      trigger,
    });

    return { ...result, skipped: false };
  }

  if (mode === "canary") {
    if (!force && !due) {
      return { activityIds: [], linked: 0, skipped: true };
    }

    const claimed = await claimGuestLinkCheck(
      prisma,
      profile,
      fingerprint,
      new Date(),
      force,
    );

    if (!claimed) {
      logPerformanceShadow("b1_guest_link", {
        candidateCount: 0,
        durationMs: Date.now() - startedAt,
        due,
        linked: 0,
        mode,
        trigger,
      });

      return { activityIds: [], linked: 0, skipped: true };
    }
  }

  let result: Awaited<ReturnType<typeof linkGuestParticipationsForProfile>>;

  try {
    result = await linkGuestParticipationsForProfile(prisma, profile);
  } catch (error) {
    if (mode === "canary") {
      await prisma.userProfile.updateMany({
        where: {
          id: profile.id,
          guestLinkFingerprint: fingerprint,
        },
        data: {
          guestLinkCheckedAt: null,
        },
      });
    }

    throw error;
  }

  if (mode === "canary") {
    await prisma.userProfile.updateMany({
      where: {
        id: profile.id,
        guestLinkFingerprint: fingerprint,
      },
      data: {
        guestLinkLastLinkedAt: result.linked > 0 ? new Date() : undefined,
      },
    });
  }

  logPerformanceShadow("b1_guest_link", {
    candidateCount: result.linked,
    durationMs: Date.now() - startedAt,
    due,
    linked: result.linked,
    mode,
    trigger,
  });

  return { ...result, skipped: false };
}
