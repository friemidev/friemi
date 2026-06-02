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
import { getPublicEventCopy } from "@/features/public-events/copy";
import { normalizeActivitySourceUrl } from "@/lib/activity-dedupe";
import type { ActivityStatus } from "@prisma/client";

export type CreateActivityState = ActivityFormState;

const activeTeamStatuses: ActivityStatus[] = ["RECRUITING", "CONFIRMED"];

export async function createActivityAction(
  previousState: CreateActivityState,
  formData: FormData,
): Promise<CreateActivityState> {
  const locale = getString(formData, "locale") || "zh-CN";
  const publicEventCopy = getPublicEventCopy(locale);
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
  const publicEventId = result.data.publicEventId ?? null;
  const publicEvent = publicEventId
    ? await prisma.publicEvent.findFirst({
        where: {
          id: publicEventId,
          visibility: "PUBLIC",
        },
        select: {
          id: true,
          status: true,
          startAt: true,
          endAt: true,
        },
      })
    : null;

  if (publicEventId && !publicEvent) {
    return buildActivityErrorState(
      previousState,
      rawInput,
      publicEventCopy.eventUnavailableError,
    );
  }

  if (publicEvent) {
    if (publicEvent.status === "CANCELLED") {
      return buildActivityErrorState(
        previousState,
        rawInput,
        publicEventCopy.eventCancelledError,
      );
    }

    const publicEventEndBoundary = publicEvent.endAt ?? publicEvent.startAt;

    if (publicEventEndBoundary <= new Date()) {
      return buildActivityErrorState(
        previousState,
        rawInput,
        publicEventCopy.eventEndedError,
      );
    }

    const existingTeam = await prisma.activity.findFirst({
      where: {
        organizerId: profile.id,
        publicEventId: publicEvent.id,
        status: {
          in: activeTeamStatuses,
        },
      },
      select: {
        id: true,
      },
    });

    if (existingTeam) {
      return buildActivityErrorState(
        previousState,
        rawInput,
        publicEventCopy.duplicateTeamError,
      );
    }
  }

  const importSourceUrl = result.data.importSourceUrl
    ? normalizeActivitySourceUrl(result.data.importSourceUrl)
    : null;
  const importSourceHost = importSourceUrl
    ? new URL(importSourceUrl).hostname.replace(/^www\./i, "")
    : null;

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
        source: importSourceHost,
        sourceUrl: importSourceUrl,
        publicEventId: publicEvent?.id ?? null,
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
