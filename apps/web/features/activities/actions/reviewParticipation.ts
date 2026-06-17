"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { getCopy } from "@/lib/copy";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";
import { createNotification } from "@/features/notifications/utils/createNotification";

const reviewParticipationSchema = z.object({
  activityId: z.string().min(1),
  locale: z.string().min(1).default("zh-CN"),
  participationId: z.string().min(1),
  decision: z.enum(["approve", "reject"]),
});

export type ReviewParticipationState = {
  formError?: string;
};

type ReviewParticipationResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      error: string;
    };

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function getActivityEndBoundary(activity: {
  startAt: Date;
  endAt: Date | null;
}) {
  return activity.endAt ?? activity.startAt;
}

function isPrismaTransactionConflictError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2034"
  );
}

function refreshActivityViews(locale: string, activityId: string) {
  const activityPath = withLocale(locale, `/activities/${activityId}`);

  revalidatePath(activityPath);
  revalidatePath(withLocale(locale, "/activities"));
  revalidatePath(withLocale(locale, "/"));
  revalidatePath(withLocale(locale, "/profile"));
  revalidatePath(withLocale(locale, "/notifications"));
  revalidatePath(withLocale(locale, "/"), "layout");

  return activityPath;
}

function getGuestParticipationId(value: string) {
  return value.startsWith("guest:") ? value.slice("guest:".length) : null;
}

export async function reviewParticipationAction(
  _previousState: ReviewParticipationState,
  formData: FormData,
): Promise<ReviewParticipationState> {
  const rawInput = {
    activityId: getString(formData, "activityId"),
    locale: getString(formData, "locale") || "zh-CN",
    participationId: getString(formData, "participationId"),
    decision: getString(formData, "decision"),
  };
  const copy = getCopy(rawInput.locale).approval;
  const result = reviewParticipationSchema.safeParse(rawInput);

  if (!result.success) {
    return {
      formError: copy.refreshError,
    };
  }

  const profile = await ensureCurrentUserProfile(result.data.locale);

  try {
    const reviewResult = await prisma.$transaction(
      async (tx): Promise<ReviewParticipationResult> => {
        const guestParticipationId = getGuestParticipationId(
          result.data.participationId,
        );

        if (guestParticipationId) {
          const participation = await tx.guestActivityParticipant.findUnique({
            where: {
              id: guestParticipationId,
            },
            select: {
              id: true,
              status: true,
              activityId: true,
              activity: {
                select: {
                  id: true,
                  capacity: true,
                  endAt: true,
                  organizerId: true,
                  startAt: true,
                  status: true,
                  _count: {
                    select: {
                      participants: {
                        where: {
                          status: "APPROVED",
                        },
                      },
                      guestParticipants: {
                        where: {
                          linkedParticipantId: null,
                          status: "APPROVED",
                        },
                      },
                    },
                  },
                },
              },
            },
          });

          if (
            !participation ||
            participation.activityId !== result.data.activityId
          ) {
            return {
              ok: false,
              error: copy.missingError,
            };
          }

          if (participation.activity.organizerId !== profile.id) {
            return {
              ok: false,
              error: copy.permissionError,
            };
          }

          if (participation.status !== "PENDING") {
            return {
              ok: false,
              error: copy.statusError,
            };
          }

          if (
            participation.activity.status === "CANCELLED" ||
            participation.activity.status === "ENDED" ||
            getActivityEndBoundary(participation.activity) <= new Date()
          ) {
            return {
              ok: false,
              error: copy.closedError,
            };
          }

          if (
            result.data.decision === "approve" &&
            participation.activity.capacity > 0 &&
            participation.activity._count.participants +
              participation.activity._count.guestParticipants >=
              participation.activity.capacity
          ) {
            return {
              ok: false,
              error: copy.fullError,
            };
          }

          await tx.guestActivityParticipant.update({
            where: {
              id: participation.id,
            },
            data: {
              status:
                result.data.decision === "approve" ? "APPROVED" : "REJECTED",
            },
          });

          return {
            ok: true,
          };
        }

        const participation = await tx.activityParticipant.findUnique({
          where: {
            id: result.data.participationId,
          },
          select: {
            id: true,
            status: true,
            activityId: true,
            userProfileId: true,
            activity: {
              select: {
                id: true,
                capacity: true,
                endAt: true,
                organizerId: true,
                startAt: true,
                status: true,
                _count: {
                  select: {
                    participants: {
                      where: {
                        status: "APPROVED",
                      },
                    },
                    guestParticipants: {
                      where: {
                        linkedParticipantId: null,
                        status: "APPROVED",
                      },
                    },
                  },
                },
              },
            },
          },
        });

        if (
          !participation ||
          participation.activityId !== result.data.activityId
        ) {
          return {
            ok: false,
            error: copy.missingError,
          };
        }

        if (participation.activity.organizerId !== profile.id) {
          return {
            ok: false,
            error: copy.permissionError,
          };
        }

        if (participation.status !== "PENDING") {
          return {
            ok: false,
            error: copy.statusError,
          };
        }

        if (
          participation.activity.status === "CANCELLED" ||
          participation.activity.status === "ENDED" ||
          getActivityEndBoundary(participation.activity) <= new Date()
        ) {
          return {
            ok: false,
            error: copy.closedError,
          };
        }

        if (
          result.data.decision === "approve" &&
          participation.activity.capacity > 0 &&
          participation.activity._count.participants +
            participation.activity._count.guestParticipants >=
            participation.activity.capacity
        ) {
          return {
            ok: false,
            error: copy.fullError,
          };
        }

        await tx.activityParticipant.update({
          where: {
            id: participation.id,
          },
          data: {
            status:
              result.data.decision === "approve" ? "APPROVED" : "REJECTED",
          },
        });

        await createNotification(tx, {
          actorId: profile.id,
          activityId: participation.activityId,
          recipientId: participation.userProfileId,
          type:
            result.data.decision === "approve"
              ? "PARTICIPATION_APPROVED"
              : "PARTICIPATION_REJECTED",
        });

        return {
          ok: true,
        };
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      },
    );

    if (!reviewResult.ok) {
      return {
        formError: reviewResult.error,
      };
    }
  } catch (error) {
    if (isPrismaTransactionConflictError(error)) {
      return {
        formError: copy.conflictError,
      };
    }

    console.error("Failed to review participation", error);

    return {
      formError: copy.failedError,
    };
  }

  redirect(refreshActivityViews(result.data.locale, result.data.activityId));
}
