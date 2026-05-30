"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createActivitySchema } from "@/features/activities/schemas/activitySchema";
import { createNotifications } from "@/features/notifications/utils/createNotification";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";
import type { ParticipantStatus } from "@prisma/client";
import {
  buildActivityErrorState,
  formatStoredDescription,
  getActivityFormValues,
  getString,
  parseParisDateTime,
  type ActivityFormState,
} from "./activityActionUtils";

export type UpdateActivityState = ActivityFormState;

const countedParticipantStatuses: ParticipantStatus[] = ["JOINED", "APPROVED"];
const notifiableParticipantStatuses: ParticipantStatus[] = [
  "JOINED",
  "PENDING",
  "APPROVED",
];

function hasDateChanged(before: Date | null, after: Date | null) {
  return (before?.getTime() ?? null) !== (after?.getTime() ?? null);
}

function normalizeText(value: string | null | undefined) {
  return (value ?? "").trim();
}

export async function updateActivityAction(
  previousState: UpdateActivityState,
  formData: FormData,
): Promise<UpdateActivityState> {
  const locale = getString(formData, "locale") || "zh-CN";
  const activityId = getString(formData, "activityId");
  const rawInput = getActivityFormValues(formData);

  if (!activityId) {
    return buildActivityErrorState(
      previousState,
      rawInput,
      "缺少活动信息，请返回详情页后重试。",
    );
  }

  const profile = await ensureCurrentUserProfile(locale);
  const editableActivity = await prisma.activity.findFirst({
    where: {
      id: activityId,
      organizerId: profile.id,
    },
    select: {
      address: true,
      city: true,
      id: true,
      endAt: true,
      startAt: true,
      status: true,
      participants: {
        where: {
          status: {
            in: notifiableParticipantStatuses,
          },
        },
        select: {
          userProfileId: true,
        },
      },
      _count: {
        select: {
          participants: {
            where: {
              status: {
                in: countedParticipantStatuses,
              },
            },
          },
        },
      },
    },
  });

  if (!editableActivity) {
    return buildActivityErrorState(
      previousState,
      rawInput,
      "你没有权限编辑这个活动。",
    );
  }

  if (
    editableActivity.status === "CANCELLED" ||
    editableActivity.status === "ENDED" ||
    (editableActivity.endAt ?? editableActivity.startAt) <= new Date()
  ) {
    return buildActivityErrorState(
      previousState,
      rawInput,
      "活动已结束或已取消，不能继续编辑。",
    );
  }

  const result = createActivitySchema.safeParse(rawInput);

  if (!result.success) {
    const flattened = result.error.flatten();

    return buildActivityErrorState(
      previousState,
      rawInput,
      "请检查表单内容后再保存。",
      flattened.fieldErrors,
    );
  }

  const startAt = parseParisDateTime(result.data.startAt);
  const endAt = result.data.endAt
    ? parseParisDateTime(result.data.endAt)
    : null;

  if (!startAt) {
    return buildActivityErrorState(
      previousState,
      rawInput,
      "开始时间格式无效。",
      {
        startAt: ["请选择有效的开始时间"],
      },
    );
  }

  if (result.data.endAt && !endAt) {
    return buildActivityErrorState(
      previousState,
      rawInput,
      "结束时间格式无效。",
      {
        endAt: ["请选择有效的结束时间"],
      },
    );
  }

  if (startAt < new Date()) {
    return buildActivityErrorState(
      previousState,
      rawInput,
      "开始时间不能早于当前时间。",
      {
        startAt: ["请选择未来的开始时间"],
      },
    );
  }

  if (endAt && endAt <= startAt) {
    return buildActivityErrorState(
      previousState,
      rawInput,
      "结束时间必须晚于开始时间。",
      {
        endAt: ["结束时间必须晚于开始时间"],
      },
    );
  }

  if (result.data.capacity < editableActivity._count.participants) {
    return buildActivityErrorState(
      previousState,
      rawInput,
      "人数上限不能低于当前已报名人数。",
      {
        capacity: [
          `当前已有 ${editableActivity._count.participants} 人报名，请设置不低于该人数的上限。`,
        ],
      },
    );
  }

  const keyFieldsChanged =
    hasDateChanged(editableActivity.startAt, startAt) ||
    hasDateChanged(editableActivity.endAt, endAt) ||
    normalizeText(editableActivity.city) !== normalizeText(result.data.city) ||
    normalizeText(editableActivity.address) !==
      normalizeText(result.data.address);

  try {
    await prisma.$transaction(async (tx) => {
      await tx.activity.update({
        where: {
          id: activityId,
        },
        data: {
          title: result.data.title,
          description: formatStoredDescription(result.data),
          itinerary: result.data.itinerary,
          coverImageUrl: result.data.coverImageUrl,
          type: result.data.type,
          category: result.data.category,
          city: result.data.city,
          destination: result.data.destination,
          address: result.data.address,
          latitude: result.data.latitude ?? null,
          longitude: result.data.longitude ?? null,
          startAt,
          endAt,
          capacity: result.data.capacity,
          minParticipants: result.data.minParticipants ?? null,
          requiresApproval: result.data.requiresApproval,
          priceType: result.data.priceType,
          priceText: result.data.priceText,
        },
      });

      if (keyFieldsChanged) {
        const recipientIds = Array.from(
          new Set(
            editableActivity.participants
              .map((participant) => participant.userProfileId)
              .filter((userProfileId) => userProfileId !== profile.id),
          ),
        );

        await createNotifications(
          tx,
          recipientIds.map((recipientId) => ({
            actorId: profile.id,
            activityId,
            recipientId,
            type: "ACTIVITY_UPDATED",
          })),
        );
      }
    });
  } catch (error) {
    console.error("Failed to update activity", error);

    return buildActivityErrorState(
      previousState,
      rawInput,
      "保存活动失败，请稍后重试。",
    );
  }

  revalidatePath(withLocale(locale, `/activities/${activityId}`));
  revalidatePath(withLocale(locale, "/activities"));
  revalidatePath(withLocale(locale, "/notifications"));
  revalidatePath(withLocale(locale, "/"), "layout");

  redirect(withLocale(locale, `/activities/${activityId}`));
}
