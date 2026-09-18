import "server-only";

import type {
  ActivityPollAudience,
  ActivityPollGuestIdentityMode,
  ActivityPollKind,
  ActivityPollResultVisibility,
  ActivityPollStatus,
  ActivityPollVoterVisibility,
  ParticipantStatus,
} from "@prisma/client";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { getPollGuestCookieName, hashPollToken } from "../pollTokens";
import { resolveEffectivePollStatus } from "../pollRules";

const activeParticipantStatuses: ParticipantStatus[] = ["JOINED", "APPROVED"];

type PollActivityAccess = {
  isManager: boolean;
  isMember: boolean;
};

export type ActivityPollListItem = {
  id: string;
  question: string;
  kind: ActivityPollKind;
  status: ActivityPollStatus;
  effectiveStatus: ActivityPollStatus;
  closesAt: string | null;
  participantCount: number;
  optionCount: number;
  createdAt: string;
};

export type ActivityPollListData = {
  activity: {
    id: string;
    title: string;
  };
  canCreate: boolean;
  polls: ActivityPollListItem[];
};

export type ActivityPollViewData = {
  id: string;
  activity: {
    id: string;
    title: string;
    organizerNickname: string;
  };
  question: string;
  description: string | null;
  kind: ActivityPollKind;
  maxSelections: number | null;
  status: ActivityPollStatus;
  effectiveStatus: ActivityPollStatus;
  resultVisibility: ActivityPollResultVisibility;
  voterVisibility: ActivityPollVoterVisibility;
  closesAt: string | null;
  closedAt: string | null;
  creatorNickname: string;
  participantCount: number;
  viewerIsAuthenticated: boolean;
  canManage: boolean;
  canVote: boolean;
  accessDeniedReason: "LOGIN_REQUIRED" | "MEMBER_REQUIRED" | null;
  resultVisible: boolean;
  viewerBallotId: string | null;
  viewerSelectionIds: string[];
  viewerGuestNickname: string | null;
  viewerIsAnonymousGuest: boolean;
  options: Array<{
    id: string;
    label: string;
    position: number;
    count: number;
    percentage: number;
    selected: boolean;
    voters: string[];
  }>;
  finalOptionId: string | null;
  finalNote: string | null;
  share: {
    audience: ActivityPollAudience;
    guestIdentityMode: ActivityPollGuestIdentityMode | null;
    active: boolean;
  } | null;
  shareToken: string | null;
};

function getActivityAccess(
  activity: {
    organizerId: string;
    coManagers: Array<{ managerProfileId: string }>;
    participants: Array<{ userProfileId: string; status: ParticipantStatus }>;
  },
  profileId: string | null,
): PollActivityAccess {
  if (!profileId) {
    return { isManager: false, isMember: false };
  }

  const isManager =
    activity.organizerId === profileId ||
    activity.coManagers.some(
      (manager) => manager.managerProfileId === profileId,
    );
  const isMember =
    isManager ||
    activity.participants.some(
      (participant) =>
        participant.userProfileId === profileId &&
        activeParticipantStatuses.includes(participant.status),
    );

  return { isManager, isMember };
}

function canSeeResults({
  canManage,
  effectiveStatus,
  hasVoted,
  visibility,
}: {
  canManage: boolean;
  effectiveStatus: ActivityPollStatus;
  hasVoted: boolean;
  visibility: ActivityPollResultVisibility;
}) {
  if (canManage) return true;
  if (visibility === "ALWAYS") return true;
  if (visibility === "AFTER_VOTE") return hasVoted;
  if (visibility === "AFTER_CLOSE") return effectiveStatus === "CLOSED";

  return false;
}

function canVoteFromShare({
  access,
  audience,
  profileId,
}: {
  access: PollActivityAccess;
  audience: ActivityPollAudience;
  profileId: string | null;
}) {
  if (audience === "MEMBERS_ONLY") return access.isMember;
  if (audience === "SIGNED_IN_WITH_LINK") return Boolean(profileId);

  return true;
}

const pollInclude = {
  activity: {
    select: {
      id: true,
      title: true,
      organizerId: true,
      status: true,
      endAt: true,
      organizer: {
        select: {
          nickname: true,
        },
      },
      coManagers: {
        select: {
          managerProfileId: true,
        },
      },
      participants: {
        select: {
          userProfileId: true,
          status: true,
        },
      },
    },
  },
  createdBy: {
    select: {
      nickname: true,
    },
  },
  options: {
    orderBy: {
      position: "asc" as const,
    },
  },
  share: true,
};

export async function getActivityPollEntrySummary(activityId: string) {
  const [openCount, totalCount] = await Promise.all([
    prisma.activityPoll.count({
      where: {
        activityId,
        status: "OPEN",
        OR: [{ closesAt: null }, { closesAt: { gt: new Date() } }],
      },
    }),
    prisma.activityPoll.count({ where: { activityId } }),
  ]);

  return { openCount, totalCount };
}

export async function getActivityPollList(
  activityId: string,
  profileId: string,
): Promise<ActivityPollListData | null> {
  const activity = await prisma.activity.findUnique({
    where: { id: activityId },
    select: {
      id: true,
      title: true,
      organizerId: true,
      coManagers: { select: { managerProfileId: true } },
      participants: {
        where: { userProfileId: profileId },
        select: { userProfileId: true, status: true },
      },
      polls: {
        where: { status: { not: "ARCHIVED" } },
        orderBy: [{ status: "asc" }, { createdAt: "desc" }],
        select: {
          id: true,
          question: true,
          kind: true,
          status: true,
          closesAt: true,
          createdAt: true,
          _count: {
            select: {
              options: true,
              ballots: { where: { status: "SUBMITTED" } },
            },
          },
        },
      },
    },
  });

  if (!activity) return null;
  const access = getActivityAccess(activity, profileId);

  if (!access.isMember) return null;

  return {
    activity: { id: activity.id, title: activity.title },
    canCreate: access.isManager,
    polls: activity.polls.map((poll) => ({
      id: poll.id,
      question: poll.question,
      kind: poll.kind,
      status: poll.status,
      effectiveStatus: resolveEffectivePollStatus(poll.status, poll.closesAt),
      closesAt: poll.closesAt?.toISOString() ?? null,
      participantCount: poll._count.ballots,
      optionCount: poll._count.options,
      createdAt: poll.createdAt.toISOString(),
    })),
  };
}

async function buildPollView({
  pollId,
  profileId,
  guestEditToken,
  shareToken,
}: {
  pollId: string;
  profileId: string | null;
  guestEditToken?: string | null;
  shareToken?: string | null;
}): Promise<ActivityPollViewData | null> {
  const poll = await prisma.activityPoll.findUnique({
    where: { id: pollId },
    include: pollInclude,
  });

  if (!poll || poll.status === "ARCHIVED") return null;

  const access = getActivityAccess(poll.activity, profileId);
  const validShare = Boolean(
    shareToken &&
    poll.share &&
    poll.share.tokenHash === hashPollToken(shareToken) &&
    !poll.share.revokedAt &&
    (!poll.share.expiresAt || poll.share.expiresAt > new Date()),
  );

  if (!shareToken && !access.isMember) return null;
  if (shareToken && !validShare) return null;

  const guestTokenHash = guestEditToken ? hashPollToken(guestEditToken) : null;
  const viewerBallot = profileId
    ? await prisma.activityPollBallot.findUnique({
        where: {
          pollId_profileId: { pollId: poll.id, profileId },
        },
        include: { selections: { select: { optionId: true } } },
      })
    : guestTokenHash
      ? await prisma.activityPollBallot.findFirst({
          where: {
            pollId: poll.id,
            editTokenHash: guestTokenHash,
          },
          include: { selections: { select: { optionId: true } } },
        })
      : null;

  const hasVoted = viewerBallot?.status === "SUBMITTED";
  const effectiveStatus = resolveEffectivePollStatus(
    poll.status,
    poll.closesAt,
  );
  const shareAllowsVote = poll.share
    ? canVoteFromShare({
        access,
        audience: poll.share.audience,
        profileId,
      })
    : false;
  const hasVotingAccess = shareToken ? shareAllowsVote : access.isMember;
  const resultVisible = canSeeResults({
    canManage: access.isManager,
    effectiveStatus,
    hasVoted,
    visibility: poll.resultVisibility,
  });
  const participantCount = await prisma.activityPollBallot.count({
    where: { pollId: poll.id, status: "SUBMITTED" },
  });
  const groupedCounts = await prisma.activityPollSelection.groupBy({
    by: ["optionId"],
    where: {
      option: { pollId: poll.id },
      ballot: { pollId: poll.id, status: "SUBMITTED" },
    },
    _count: { _all: true },
  });
  const countByOption = new Map(
    groupedCounts.map((entry) => [entry.optionId, entry._count._all]),
  );
  const canSeeVoters =
    resultVisible &&
    (access.isManager || poll.voterVisibility === "PARTICIPANTS_VISIBLE");
  const ballots = canSeeVoters
    ? await prisma.activityPollBallot.findMany({
        where: { pollId: poll.id, status: "SUBMITTED" },
        select: {
          guestNickname: true,
          guestDisplayCode: true,
          isAnonymousGuest: true,
          profile: { select: { nickname: true } },
          selections: { select: { optionId: true } },
        },
        orderBy: { submittedAt: "asc" },
      })
    : [];

  const selectedIds = new Set(
    hasVoted
      ? viewerBallot.selections.map((selection) => selection.optionId)
      : [],
  );

  return {
    id: poll.id,
    activity: {
      id: poll.activity.id,
      title: poll.activity.title,
      organizerNickname: poll.activity.organizer.nickname,
    },
    question: poll.question,
    description: poll.description,
    kind: poll.kind,
    maxSelections: poll.maxSelections,
    status: poll.status,
    effectiveStatus,
    resultVisibility: poll.resultVisibility,
    voterVisibility: poll.voterVisibility,
    closesAt: poll.closesAt?.toISOString() ?? null,
    closedAt: poll.closedAt?.toISOString() ?? null,
    creatorNickname: poll.createdBy.nickname,
    participantCount,
    viewerIsAuthenticated: Boolean(profileId),
    canManage: access.isManager,
    canVote: hasVotingAccess && effectiveStatus === "OPEN",
    accessDeniedReason: hasVotingAccess
      ? null
      : profileId
        ? "MEMBER_REQUIRED"
        : "LOGIN_REQUIRED",
    resultVisible,
    viewerBallotId: hasVoted ? (viewerBallot?.id ?? null) : null,
    viewerSelectionIds: Array.from(selectedIds),
    viewerGuestNickname: viewerBallot?.guestNickname ?? null,
    viewerIsAnonymousGuest: viewerBallot?.isAnonymousGuest ?? false,
    options: poll.options.map((option) => {
      const count = countByOption.get(option.id) ?? 0;
      const voters = ballots
        .filter((ballot) =>
          ballot.selections.some(
            (selection) => selection.optionId === option.id,
          ),
        )
        .map((ballot) => {
          if (ballot.isAnonymousGuest) return "ANONYMOUS_GUEST";
          if (ballot.profile?.nickname) return ballot.profile.nickname;
          const suffix = ballot.guestDisplayCode
            ? ` · ${ballot.guestDisplayCode}`
            : "";
          return `${ballot.guestNickname ?? "Guest"}${suffix}`;
        });

      return {
        id: option.id,
        label: option.label,
        position: option.position,
        count,
        percentage:
          participantCount > 0
            ? Math.round((count / participantCount) * 100)
            : 0,
        selected: selectedIds.has(option.id),
        voters,
      };
    }),
    finalOptionId: poll.finalOptionId,
    finalNote: poll.finalNote,
    share: poll.share
      ? {
          audience: poll.share.audience,
          guestIdentityMode: poll.share.guestIdentityMode,
          active: Boolean(
            !poll.share.revokedAt &&
            (!poll.share.expiresAt || poll.share.expiresAt > new Date()),
          ),
        }
      : null,
    shareToken: shareToken ?? null,
  };
}

export async function getInternalActivityPollView({
  pollId,
  profileId,
}: {
  pollId: string;
  profileId: string;
}) {
  return buildPollView({ pollId, profileId });
}

export async function getSharedActivityPollView({
  profileId,
  shareToken,
}: {
  profileId: string | null;
  shareToken: string;
}) {
  const share = await prisma.activityPollShare.findUnique({
    where: { tokenHash: hashPollToken(shareToken) },
    select: { pollId: true },
  });

  if (!share) return null;

  const cookieStore = await cookies();
  const guestEditToken = cookieStore.get(
    getPollGuestCookieName(share.pollId),
  )?.value;

  return buildPollView({
    pollId: share.pollId,
    profileId,
    guestEditToken,
    shareToken,
  });
}

export async function getSharedActivityPollMetadata(shareToken: string) {
  const share = await prisma.activityPollShare.findUnique({
    where: { tokenHash: hashPollToken(shareToken) },
    select: {
      expiresAt: true,
      revokedAt: true,
      poll: {
        select: {
          description: true,
          question: true,
          status: true,
          activity: {
            select: {
              coverImageUrl: true,
              title: true,
              publicEvent: {
                select: {
                  coverImageUrl: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (
    !share ||
    share.revokedAt ||
    (share.expiresAt && share.expiresAt <= new Date()) ||
    share.poll.status === "ARCHIVED"
  ) {
    return null;
  }

  return {
    activityTitle: share.poll.activity.title,
    coverImageUrl:
      share.poll.activity.coverImageUrl ??
      share.poll.activity.publicEvent?.coverImageUrl ??
      null,
    description: share.poll.description,
    question: share.poll.question,
  };
}

export async function getPollForMutation(pollId: string) {
  return prisma.activityPoll.findUnique({
    where: { id: pollId },
    include: pollInclude,
  });
}

export function resolvePollActivityAccess(
  activity: Parameters<typeof getActivityAccess>[0],
  profileId: string | null,
) {
  return getActivityAccess(activity, profileId);
}

export function resolvePollEffectiveStatus(
  status: ActivityPollStatus,
  closesAt: Date | null,
) {
  return resolveEffectivePollStatus(status, closesAt);
}
