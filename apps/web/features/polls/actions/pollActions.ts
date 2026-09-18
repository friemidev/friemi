"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type {
  ActivityPollAudience,
  ActivityPollKind,
  ActivityPollResultVisibility,
  ActivityPollVoterVisibility,
} from "@prisma/client";
import { z } from "zod";
import {
  ensureCurrentUserProfile,
  getOptionalCurrentUserProfileSnapshot,
} from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";
import { checkDistributedRateLimit } from "@/lib/distributedRateLimit";
import { getPollCopy } from "../copy";
import {
  MAX_POLL_OPTIONS,
  MIN_POLL_OPTIONS,
  POLL_GUEST_IDENTITY_MODE,
  isValidPollSelection,
  normalizePollOptions,
} from "../pollRules";
import {
  createGuestDisplayCode,
  createPollBearerToken,
  getPollGuestCookieName,
  hashPollToken,
} from "../pollTokens";
import {
  getPollForMutation,
  resolvePollActivityAccess,
  resolvePollEffectiveStatus,
} from "../server/pollService";

export type PollActionState = {
  ok?: boolean;
  error?: string;
  sharePath?: string;
};

const localeSchema = z.string().min(1).max(12).default("zh-CN");
const pollKindSchema = z.enum(["SINGLE_CHOICE", "MULTIPLE_CHOICE"]);
const resultVisibilitySchema = z.enum([
  "AFTER_VOTE",
  "AFTER_CLOSE",
  "ALWAYS",
  "ORGANIZER_ONLY",
]);
const voterVisibilitySchema = z.enum([
  "COUNTS_ONLY",
  "PARTICIPANTS_VISIBLE",
  "MANAGERS_ONLY",
]);
const audienceSchema = z.enum([
  "MEMBERS_ONLY",
  "SIGNED_IN_WITH_LINK",
  "ANYONE_WITH_LINK",
]);

function getString(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getStrings(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string")
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseOptionalDate(value: string) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function isActivityClosed(activity: { endAt: Date | null; status: string }) {
  return (
    activity.status === "CANCELLED" ||
    activity.status === "ENDED" ||
    Boolean(activity.endAt && activity.endAt <= new Date())
  );
}

function refreshPollPaths(locale: string, activityId: string, pollId: string) {
  revalidatePath(withLocale(locale, `/lobby/${activityId}`));
  revalidatePath(withLocale(locale, `/lobby/${activityId}/polls`));
  revalidatePath(withLocale(locale, `/lobby/${activityId}/polls/${pollId}`));
}

export async function createActivityPollAction(
  _previousState: PollActionState,
  formData: FormData,
): Promise<PollActionState> {
  const localeResult = localeSchema.safeParse(getString(formData, "locale"));
  const locale = localeResult.success ? localeResult.data : "zh-CN";
  const copy = getPollCopy(locale);
  const activityId = getString(formData, "activityId");
  const question = getString(formData, "question").replace(/\s+/g, " ");
  const description = getString(formData, "description");
  const kindResult = pollKindSchema.safeParse(getString(formData, "kind"));
  const resultVisibilityResult = resultVisibilitySchema.safeParse(
    getString(formData, "resultVisibility"),
  );
  const voterVisibilityResult = voterVisibilitySchema.safeParse(
    getString(formData, "voterVisibility"),
  );
  const options = normalizePollOptions(getStrings(formData, "option"));
  const closesAt = parseOptionalDate(getString(formData, "closesAt"));
  const rawMaxSelections = Number(getString(formData, "maxSelections"));

  if (
    !activityId ||
    question.length < 1 ||
    question.length > 120 ||
    description.length > 500 ||
    !kindResult.success ||
    !resultVisibilityResult.success ||
    !voterVisibilityResult.success ||
    options.length < MIN_POLL_OPTIONS ||
    options.length > MAX_POLL_OPTIONS ||
    closesAt === undefined ||
    (closesAt && closesAt <= new Date())
  ) {
    return { error: copy.invalid };
  }

  const kind = kindResult.data as ActivityPollKind;
  const maxSelections =
    kind === "MULTIPLE_CHOICE"
      ? Number.isInteger(rawMaxSelections) &&
        rawMaxSelections >= 1 &&
        rawMaxSelections <= options.length
        ? rawMaxSelections
        : options.length
      : null;
  const profile = await ensureCurrentUserProfile(
    locale,
    `/lobby/${activityId}/polls/new`,
  );
  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    select: {
      id: true,
      status: true,
      endAt: true,
      organizerId: true,
      coManagers: { select: { managerProfileId: true } },
    },
  });

  if (!activity) return { error: copy.invalid };
  const canManage =
    activity.organizerId === profile.id ||
    activity.coManagers.some(
      (manager) => manager.managerProfileId === profile.id,
    );

  if (!canManage) return { error: copy.forbidden };
  if (isActivityClosed(activity)) return { error: copy.endedActivity };

  let pollId: string;

  try {
    const poll = await prisma.$transaction(async (tx) => {
      const created = await tx.activityPoll.create({
        data: {
          activityId,
          createdByProfileId: profile.id,
          question,
          description: description || null,
          kind,
          maxSelections,
          status: "OPEN",
          resultVisibility:
            resultVisibilityResult.data as ActivityPollResultVisibility,
          voterVisibility:
            voterVisibilityResult.data as ActivityPollVoterVisibility,
          closesAt,
          options: {
            create: options.map((label, position) => ({ label, position })),
          },
        },
        select: { id: true },
      });

      await tx.activityPollAuditLog.create({
        data: {
          pollId: created.id,
          actorProfileId: profile.id,
          action: "POLL_CREATED",
          metadata: { optionCount: options.length, kind },
        },
      });

      return created;
    });
    pollId = poll.id;
  } catch (error) {
    console.error("Failed to create activity poll", error);
    return { error: copy.failed };
  }

  refreshPollPaths(locale, activityId, pollId);
  redirect(withLocale(locale, `/lobby/${activityId}/polls/${pollId}`));
}

function getShareAccessError({
  audience,
  isMember,
  profileId,
}: {
  audience: ActivityPollAudience;
  isMember: boolean;
  profileId: string | null;
}) {
  if (audience === "MEMBERS_ONLY" && !isMember) {
    return profileId ? "MEMBER_REQUIRED" : "LOGIN_REQUIRED";
  }

  if (audience === "SIGNED_IN_WITH_LINK" && !profileId) {
    return "LOGIN_REQUIRED";
  }

  return null;
}

export async function submitActivityPollVoteAction(
  _previousState: PollActionState,
  formData: FormData,
): Promise<PollActionState> {
  const localeResult = localeSchema.safeParse(getString(formData, "locale"));
  const locale = localeResult.success ? localeResult.data : "zh-CN";
  const copy = getPollCopy(locale);
  const pollId = getString(formData, "pollId");
  const shareToken = getString(formData, "shareToken");
  const guestNickname = getString(formData, "guestNickname").slice(0, 30);
  const selectedOptionIds = Array.from(
    new Set(getStrings(formData, "optionId")),
  );
  const poll = await getPollForMutation(pollId);

  if (!poll) return { error: copy.invalid };

  const profile = await getOptionalCurrentUserProfileSnapshot();
  const access = resolvePollActivityAccess(poll.activity, profile?.id ?? null);
  const validShare = Boolean(
    shareToken &&
    poll.share &&
    poll.share.tokenHash === hashPollToken(shareToken) &&
    !poll.share.revokedAt &&
    (!poll.share.expiresAt || poll.share.expiresAt > new Date()),
  );
  const accessError = shareToken
    ? validShare && poll.share
      ? getShareAccessError({
          audience: poll.share.audience,
          isMember: access.isMember,
          profileId: profile?.id ?? null,
        })
      : "MEMBER_REQUIRED"
    : access.isMember
      ? null
      : profile
        ? "MEMBER_REQUIRED"
        : "LOGIN_REQUIRED";

  if (accessError === "LOGIN_REQUIRED") return { error: copy.loginRequired };
  if (accessError) return { error: copy.memberRequired };
  if (resolvePollEffectiveStatus(poll.status, poll.closesAt) !== "OPEN") {
    return { error: copy.closed };
  }

  const validOptionIds = new Set(poll.options.map((option) => option.id));
  if (
    selectedOptionIds.length < 1 ||
    selectedOptionIds.some((id) => !validOptionIds.has(id)) ||
    !isValidPollSelection({
      kind: poll.kind,
      maxSelections: poll.maxSelections,
      optionCount: poll.options.length,
      selectedCount: selectedOptionIds.length,
    })
  ) {
    return { error: copy.selectAtLeastOne };
  }

  let rawGuestToken: string | null = null;
  let guestKeyHash: string | null = null;
  const isAnonymousGuest = false;

  if (!profile) {
    if (
      !validShare ||
      poll.share?.audience !== "ANYONE_WITH_LINK" ||
      !poll.share.guestIdentityMode
    ) {
      return { error: copy.loginRequired };
    }

    if (!guestNickname) {
      return { error: copy.invalid };
    }
    const cookieStore = await cookies();
    rawGuestToken =
      cookieStore.get(getPollGuestCookieName(poll.id))?.value ??
      createPollBearerToken();
    guestKeyHash = hashPollToken(rawGuestToken);
  }

  const rateLimit = await checkDistributedRateLimit({
    identifier: `${poll.id}:${profile?.id ?? guestKeyHash ?? "unknown"}`,
    limit: 20,
    scope: "activity-poll-vote",
    window: "1 m",
  });
  if (!rateLimit.allowed) return { error: copy.tooManyRequests };

  try {
    await prisma.$transaction(async (tx) => {
      const existing = profile
        ? await tx.activityPollBallot.findUnique({
            where: {
              pollId_profileId: { pollId: poll.id, profileId: profile.id },
            },
            select: { id: true },
          })
        : await tx.activityPollBallot.findUnique({
            where: {
              pollId_guestKeyHash: {
                pollId: poll.id,
                guestKeyHash: guestKeyHash!,
              },
            },
            select: { id: true },
          });
      const ballot = existing
        ? await tx.activityPollBallot.update({
            where: { id: existing.id },
            data: {
              status: "SUBMITTED",
              profileId: profile?.id ?? null,
              guestNickname: profile ? null : guestNickname || null,
              isAnonymousGuest: profile ? false : isAnonymousGuest,
              removedAt: null,
              removedReason: null,
              submittedAt: new Date(),
              version: { increment: 1 },
            },
            select: { id: true },
          })
        : await tx.activityPollBallot.create({
            data: {
              pollId: poll.id,
              profileId: profile?.id ?? null,
              guestKeyHash,
              editTokenHash: guestKeyHash,
              guestNickname: profile ? null : guestNickname || null,
              guestDisplayCode: profile ? null : createGuestDisplayCode(),
              isAnonymousGuest: profile ? false : isAnonymousGuest,
              status: "SUBMITTED",
            },
            select: { id: true },
          });

      await tx.activityPollSelection.deleteMany({
        where: { ballotId: ballot.id },
      });
      await tx.activityPollSelection.createMany({
        data: selectedOptionIds.map((optionId) => ({
          ballotId: ballot.id,
          optionId,
        })),
      });
    });

    if (rawGuestToken) {
      const cookieStore = await cookies();
      cookieStore.set(getPollGuestCookieName(poll.id), rawGuestToken, {
        httpOnly: true,
        maxAge: 60 * 60 * 24 * 90,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
      });
    }

    refreshPollPaths(locale, poll.activityId, poll.id);
    if (shareToken) {
      revalidatePath(withLocale(locale, `/poll/${shareToken}`));
    }

    return { ok: true };
  } catch (error) {
    console.error("Failed to submit activity poll ballot", error);
    return { error: copy.failed };
  }
}

export async function withdrawActivityPollVoteAction(
  _previousState: PollActionState,
  formData: FormData,
): Promise<PollActionState> {
  const locale = getString(formData, "locale") || "zh-CN";
  const copy = getPollCopy(locale);
  const pollId = getString(formData, "pollId");
  const shareToken = getString(formData, "shareToken");
  const poll = await getPollForMutation(pollId);

  if (
    !poll ||
    resolvePollEffectiveStatus(poll.status, poll.closesAt) !== "OPEN"
  ) {
    return { error: copy.closed };
  }

  const profile = await getOptionalCurrentUserProfileSnapshot();
  const cookieStore = await cookies();
  const guestToken = cookieStore.get(getPollGuestCookieName(poll.id))?.value;
  const ballot = profile
    ? await prisma.activityPollBallot.findUnique({
        where: {
          pollId_profileId: { pollId: poll.id, profileId: profile.id },
        },
        select: { id: true },
      })
    : guestToken
      ? await prisma.activityPollBallot.findFirst({
          where: {
            pollId: poll.id,
            editTokenHash: hashPollToken(guestToken),
          },
          select: { id: true },
        })
      : null;

  if (!ballot) return { error: copy.invalid };

  await prisma.activityPollBallot.update({
    where: { id: ballot.id },
    data: { status: "WITHDRAWN", version: { increment: 1 } },
  });
  refreshPollPaths(locale, poll.activityId, poll.id);
  if (shareToken) revalidatePath(withLocale(locale, `/poll/${shareToken}`));

  return { ok: true };
}

export async function configureActivityPollShareAction(
  _previousState: PollActionState,
  formData: FormData,
): Promise<PollActionState> {
  const locale = getString(formData, "locale") || "zh-CN";
  const copy = getPollCopy(locale);
  const pollId = getString(formData, "pollId");
  const audienceResult = audienceSchema.safeParse(
    getString(formData, "audience"),
  );

  if (!pollId || !audienceResult.success) return { error: copy.invalid };

  const profile = await ensureCurrentUserProfile(locale);
  const poll = await getPollForMutation(pollId);
  if (!poll) return { error: copy.invalid };
  const access = resolvePollActivityAccess(poll.activity, profile.id);
  if (!access.isManager) return { error: copy.forbidden };

  const audience = audienceResult.data as ActivityPollAudience;
  const guestIdentityMode =
    audience === "ANYONE_WITH_LINK" ? POLL_GUEST_IDENTITY_MODE : null;
  const rawToken = createPollBearerToken();
  const tokenHash = hashPollToken(rawToken);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.activityPollShare.upsert({
        where: { pollId: poll.id },
        create: {
          pollId: poll.id,
          createdByProfileId: profile.id,
          tokenHash,
          audience,
          guestIdentityMode,
        },
        update: {
          createdByProfileId: profile.id,
          tokenHash,
          audience,
          guestIdentityMode,
          revokedAt: null,
        },
      });
      await tx.activityPollAuditLog.create({
        data: {
          pollId: poll.id,
          actorProfileId: profile.id,
          action: "SHARE_LINK_ROTATED",
          metadata: { audience, guestIdentityMode },
        },
      });
    });
  } catch (error) {
    console.error("Failed to configure poll sharing", error);
    return { error: copy.failed };
  }

  refreshPollPaths(locale, poll.activityId, poll.id);
  return {
    ok: true,
    sharePath: withLocale(locale, `/poll/${rawToken}`),
  };
}

export async function revokeActivityPollShareAction(
  _previousState: PollActionState,
  formData: FormData,
): Promise<PollActionState> {
  const locale = getString(formData, "locale") || "zh-CN";
  const copy = getPollCopy(locale);
  const pollId = getString(formData, "pollId");
  const profile = await ensureCurrentUserProfile(locale);
  const poll = await getPollForMutation(pollId);

  if (!poll) return { error: copy.invalid };
  const access = resolvePollActivityAccess(poll.activity, profile.id);
  if (!access.isManager) return { error: copy.forbidden };
  if (!poll.share) return { ok: true };

  try {
    await prisma.$transaction([
      prisma.activityPollShare.update({
        where: { pollId: poll.id },
        data: { revokedAt: new Date() },
      }),
      prisma.activityPollAuditLog.create({
        data: {
          pollId: poll.id,
          actorProfileId: profile.id,
          action: "SHARE_LINK_REVOKED",
        },
      }),
    ]);
    refreshPollPaths(locale, poll.activityId, poll.id);
    return { ok: true };
  } catch (error) {
    console.error("Failed to revoke poll sharing", error);
    return { error: copy.failed };
  }
}

export async function changeActivityPollStatusAction(
  _previousState: PollActionState,
  formData: FormData,
): Promise<PollActionState> {
  const locale = getString(formData, "locale") || "zh-CN";
  const copy = getPollCopy(locale);
  const pollId = getString(formData, "pollId");
  const intent = getString(formData, "intent");
  const profile = await ensureCurrentUserProfile(locale);
  const poll = await getPollForMutation(pollId);

  if (!poll) return { error: copy.invalid };
  const access = resolvePollActivityAccess(poll.activity, profile.id);
  if (!access.isManager) return { error: copy.forbidden };

  const nextStatus =
    intent === "close"
      ? "CLOSED"
      : intent === "reopen"
        ? "OPEN"
        : intent === "cancel"
          ? "CANCELLED"
          : null;
  if (!nextStatus) return { error: copy.invalid };

  if (nextStatus === "OPEN" && isActivityClosed(poll.activity)) {
    return { error: copy.endedActivity };
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.activityPoll.update({
        where: { id: poll.id },
        data: {
          status: nextStatus,
          closedAt: nextStatus === "OPEN" ? null : new Date(),
          finalOptionId: nextStatus === "OPEN" ? null : poll.finalOptionId,
          closesAt:
            nextStatus === "OPEN" &&
            poll.closesAt &&
            poll.closesAt <= new Date()
              ? null
              : poll.closesAt,
          version: { increment: 1 },
        },
      });
      await tx.activityPollAuditLog.create({
        data: {
          pollId: poll.id,
          actorProfileId: profile.id,
          action: `POLL_${nextStatus}`,
        },
      });
    });
    refreshPollPaths(locale, poll.activityId, poll.id);
    return { ok: true };
  } catch (error) {
    console.error("Failed to change poll status", error);
    return { error: copy.failed };
  }
}

export async function finalizeActivityPollAction(
  _previousState: PollActionState,
  formData: FormData,
): Promise<PollActionState> {
  const locale = getString(formData, "locale") || "zh-CN";
  const copy = getPollCopy(locale);
  const pollId = getString(formData, "pollId");
  const optionId = getString(formData, "optionId");
  const profile = await ensureCurrentUserProfile(locale);
  const poll = await getPollForMutation(pollId);

  if (!poll) return { error: copy.invalid };
  const access = resolvePollActivityAccess(poll.activity, profile.id);
  if (!access.isManager) return { error: copy.forbidden };
  if (!poll.options.some((option) => option.id === optionId)) {
    return { error: copy.invalid };
  }

  await prisma.$transaction([
    prisma.activityPoll.update({
      where: { id: poll.id },
      data: {
        finalOptionId: optionId,
        status: "CLOSED",
        closedAt: poll.closedAt ?? new Date(),
        version: { increment: 1 },
      },
    }),
    prisma.activityPollAuditLog.create({
      data: {
        pollId: poll.id,
        actorProfileId: profile.id,
        action: "POLL_FINALIZED",
        metadata: { optionId },
      },
    }),
  ]);
  refreshPollPaths(locale, poll.activityId, poll.id);

  return { ok: true };
}
