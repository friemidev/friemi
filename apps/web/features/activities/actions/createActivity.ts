"use server";

import { redirect } from "next/navigation";
import { createActivitySchema } from "@/features/activities/schemas/activitySchema";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";
import {
  buildActivityErrorState,
  formatStoredDescription,
  getActivityFormValues,
  getString,
  parseParisDateTime,
  type ActivityFormState,
} from "./activityActionUtils";
import { validateActivitySchedule } from "@/features/activities/utils/validateActivitySchedule";

export type CreateActivityState = ActivityFormState;

export async function createActivityAction(
  previousState: CreateActivityState,
  formData: FormData,
): Promise<CreateActivityState> {
  const locale = getString(formData, "locale") || "zh-CN";
  const rawInput = getActivityFormValues(formData);

  const result = createActivitySchema.safeParse(rawInput);

  if (!result.success) {
    const flattened = result.error.flatten();

    return buildActivityErrorState(
      previousState,
      rawInput,
      "请检查表单内容后再提交。",
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

  const scheduleValidation = validateActivitySchedule({
    startAt,
    endAt: endAt ?? null,
  });

  if (!scheduleValidation.ok) {
    return buildActivityErrorState(
      previousState,
      rawInput,
      scheduleValidation.message,
      {
        [scheduleValidation.field]: [scheduleValidation.fieldMessage],
      },
    );
  }

  let activityId: string;
  const profile = await ensureCurrentUserProfile(locale);
  const description = formatStoredDescription(result.data);

  try {
    const activity = await prisma.activity.create({
      data: {
        title: result.data.title,
        description,
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
        status: "RECRUITING",
        visibility: "PUBLIC",
        organizerId: profile.id,
      },
      select: {
        id: true,
      },
    });

    activityId = activity.id;
  } catch (error) {
    console.error("Failed to create activity", error);

    return buildActivityErrorState(
      previousState,
      rawInput,
      "创建活动失败，请稍后重试。",
    );
  }

  redirect(withLocale(locale, `/activities/${activityId}`));
}
