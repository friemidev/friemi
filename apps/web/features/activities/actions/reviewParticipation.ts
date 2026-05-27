"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { getCopy } from "@/lib/copy";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";

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

  return activityPath;
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
        const participation = await tx.activityParticipant.findUnique({
          where: {
            id: result.data.participationId,
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
          participation.activity._count.participants >=
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
