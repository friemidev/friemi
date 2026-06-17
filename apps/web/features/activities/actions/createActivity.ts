"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { createActivitySchema } from "@/features/activities/schemas/activitySchema";
import { normalizeAnalyticsLocale } from "@/features/analytics/events";
import {
  createLatencyTimer,
  recordOperationLatency,
} from "@/features/analytics/latency";
import { trackAnalyticsEvent } from "@/features/analytics/server";
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
import { OPEN_LOBBY_ACTIVITIES_TAG } from "@/features/activities/queries/getActivityLobby";
import { normalizeActivitySourceUrl } from "@/lib/activity-dedupe";
import type { ActivityStatus } from "@prisma/client";
import { generateActivityShareToken } from "@/features/activities/utils/activityShareAccess";

export type CreateActivityState = ActivityFormState;

const activeTeamStatuses: ActivityStatus[] = ["RECRUITING", "CONFIRMED"];

type CreateActivityFailureReasonCode =
  | "duplicate_team"
  | "event_ended"
  | "event_unavailable"
  | "required_field_missing"
  | "schedule_invalid"
  | "submit_failed";

async function trackCreateActivityFailure({
  locale,
  publicEventId,
  reasonCode,
  userProfileId,
}: {
  locale: string;
  publicEventId?: string | null;
  reasonCode: CreateActivityFailureReasonCode;
  userProfileId?: string | null;
}) {
  await trackAnalyticsEvent(
    {
      locale: normalizeAnalyticsLocale(locale),
      name: "form_submit_failed",
      route: publicEventId
        ? `/${locale}/public-events/${publicEventId}/teams/new`
        : `/${locale}/activities/new`,
      entityId: publicEventId ?? undefined,
      entityType: publicEventId ? "public_event" : undefined,
      sourceSurface: publicEventId ? "public_event_detail" : "activity_detail",
      properties: {
        form_name: "create_team",
        reason_code: reasonCode,
      },
    },
    {
      userProfileId,
    },
  );
}

export async function createActivityAction(
  previousState: CreateActivityState,
  formData: FormData,
): Promise<CreateActivityState> {
  const getDurationMs = createLatencyTimer();
  const locale = getString(formData, "locale") || "zh-CN";
  const publicEventCopy = getPublicEventCopy(locale);
  const rawInput = getActivityFormValues(formData);
  const recordLatency = ({
    activityId,
    properties,
    status,
    statusReason,
    userProfileId,
  }: {
    activityId?: string | null;
    properties?: Record<string, string | number | boolean | null | undefined>;
    status: "failed" | "success";
    statusReason?: string | null;
    userProfileId?: string | null;
  }) => {
    const hasPublicEvent = Boolean(rawInput.publicEventId);

    recordOperationLatency({
      durationMs: getDurationMs(),
      entityId: activityId ?? rawInput.publicEventId ?? undefined,
      entityType: activityId ? "team" : rawInput.publicEventId ? "public_event" : undefined,
      locale,
      operationKey: "create_team",
      route: rawInput.publicEventId
        ? `/${locale}/public-events/${rawInput.publicEventId}/teams/new`
        : `/${locale}/activities/new`,
      sourceSurface: hasPublicEvent ? "public_event_detail" : "activity_detail",
      status,
      statusReason,
      userProfileId,
      properties: {
        ...properties,
        has_public_event: hasPublicEvent,
      },
    });
  };

  const result = createActivitySchema.safeParse(rawInput);

  if (!result.success) {
    const flattened = result.error.flatten();

    recordLatency({
      status: "failed",
      statusReason: "required_field_missing",
    });

    await trackCreateActivityFailure({
      locale,
      publicEventId: rawInput.publicEventId,
      reasonCode: "required_field_missing",
    });

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
    recordLatency({
      status: "failed",
      statusReason: "schedule_invalid",
    });

    await trackCreateActivityFailure({
      locale,
      publicEventId: result.data.publicEventId,
      reasonCode: "schedule_invalid",
    });

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
    recordLatency({
      status: "failed",
      statusReason: "schedule_invalid",
    });

    await trackCreateActivityFailure({
      locale,
      publicEventId: result.data.publicEventId,
      reasonCode: "schedule_invalid",
    });

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
    recordLatency({
      status: "failed",
      statusReason: "schedule_invalid",
    });

    await trackCreateActivityFailure({
      locale,
      publicEventId: result.data.publicEventId,
      reasonCode: "schedule_invalid",
    });

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
          ticketUrl: true,
          ticketLabel: true,
        },
      })
    : null;

  if (publicEventId && !publicEvent) {
    recordLatency({
      status: "failed",
      statusReason: "event_unavailable",
      userProfileId: profile.id,
    });

    await trackCreateActivityFailure({
      locale,
      publicEventId,
      reasonCode: "event_unavailable",
      userProfileId: profile.id,
    });

    return buildActivityErrorState(
      previousState,
      rawInput,
      publicEventCopy.eventUnavailableError,
    );
  }

  if (publicEvent) {
    if (publicEvent.status === "CANCELLED") {
      recordLatency({
        status: "failed",
        statusReason: "event_ended",
        userProfileId: profile.id,
      });

      await trackCreateActivityFailure({
        locale,
        publicEventId: publicEvent.id,
        reasonCode: "event_ended",
        userProfileId: profile.id,
      });

      return buildActivityErrorState(
        previousState,
        rawInput,
        publicEventCopy.eventCancelledError,
      );
    }

    const publicEventEndBoundary = publicEvent.endAt ?? publicEvent.startAt;

    if (publicEventEndBoundary <= new Date()) {
      recordLatency({
        status: "failed",
        statusReason: "event_ended",
        userProfileId: profile.id,
      });

      await trackCreateActivityFailure({
        locale,
        publicEventId: publicEvent.id,
        reasonCode: "event_ended",
        userProfileId: profile.id,
      });

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
      recordLatency({
        status: "failed",
        statusReason: "duplicate_team",
        userProfileId: profile.id,
      });

      await trackCreateActivityFailure({
        locale,
        publicEventId: publicEvent.id,
        reasonCode: "duplicate_team",
        userProfileId: profile.id,
      });

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
  const submittedCapacity = result.data.capacityLimitEnabled
    ? result.data.capacity
    : 0;
  const submittedMinParticipants = result.data.capacityLimitEnabled
    ? (result.data.minParticipants ?? null)
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
        capacity: submittedCapacity,
        minParticipants: submittedMinParticipants,
        requiresApproval: result.data.requiresApproval,
        priceType: result.data.priceType,
        priceText: result.data.priceText,
        ticketUrl: result.data.ticketUrl ?? publicEvent?.ticketUrl ?? null,
        ticketLabel: result.data.ticketLabel ?? publicEvent?.ticketLabel ?? null,
        source: importSourceHost,
        sourceUrl: importSourceUrl,
        publicEventId: publicEvent?.id ?? null,
        status: "RECRUITING",
        visibility: result.data.visibility,
        shareEnabled: result.data.visibility === "PRIVATE",
        shareToken:
          result.data.visibility === "PRIVATE"
            ? generateActivityShareToken()
            : null,
        organizerId: profile.id,
        participants: {
          create: {
            userProfileId: profile.id,
            status: "APPROVED",
          },
        },
      },
      select: {
        id: true,
      },
    });

    activityId = activity.id;
  } catch (error) {
    console.error("Failed to create activity", error);
    recordLatency({
      status: "failed",
      statusReason: "submit_failed",
      userProfileId: profile.id,
    });

    await trackCreateActivityFailure({
      locale,
      publicEventId: publicEvent?.id ?? result.data.publicEventId,
      reasonCode: "submit_failed",
      userProfileId: profile.id,
    });

    return buildActivityErrorState(
      previousState,
      rawInput,
      "发布组局失败，请稍后重试。",
    );
  }

  await trackAnalyticsEvent(
    {
      locale: normalizeAnalyticsLocale(locale),
      name: "team_created",
      route: publicEvent?.id
        ? `/${locale}/public-events/${publicEvent.id}/teams/new`
        : `/${locale}/activities/new`,
      entityId: activityId,
      entityType: "team",
      sourceSurface: publicEvent?.id ? "public_event_detail" : "activity_detail",
      properties: {
        capacity: submittedCapacity,
        category: result.data.category,
        city: result.data.city,
        has_public_event: Boolean(publicEvent?.id),
        public_event_id: publicEvent?.id ?? null,
        requires_approval: result.data.requiresApproval,
        visibility: result.data.visibility,
      },
    },
    {
      userProfileId: profile.id,
    },
  );

  if (publicEvent?.id) {
    await trackAnalyticsEvent(
      {
        locale: normalizeAnalyticsLocale(locale),
        name: "public_event_converted_to_team",
        route: `/${locale}/public-events/${publicEvent.id}/teams/new`,
        entityId: publicEvent.id,
        entityType: "public_event",
        sourceSurface: "public_event_detail",
        properties: {
          activity_id: activityId,
          public_event_id: publicEvent.id,
        },
      },
      {
        userProfileId: profile.id,
      },
    );
  }

  recordLatency({
    activityId,
    properties: {
      category: result.data.category,
      city: result.data.city,
      requires_approval: result.data.requiresApproval,
      visibility: result.data.visibility,
    },
    status: "success",
    userProfileId: profile.id,
  });

  revalidateTag(OPEN_LOBBY_ACTIVITIES_TAG);
  revalidatePath(withLocale(locale, "/lobby"));
  revalidatePath(withLocale(locale, "/activities"));
  revalidatePath(withLocale(locale, "/profile"));
  revalidatePath(withLocale(locale, "/"));
  revalidatePath(withLocale(locale, "/"), "layout");

  redirect(withLocale(locale, `/activities/${activityId}`));
}
