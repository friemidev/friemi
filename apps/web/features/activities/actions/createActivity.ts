"use server";

import { redirect } from "next/navigation";
import { createActivitySchema } from "@/features/activities/schemas/activitySchema";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";

const parisTimeZone = "Europe/Paris";

type CreateActivityFormValues = {
  title: string;
  description: string;
  itinerary: string;
  type: string;
  category: string;
  otherCategoryText: string;
  city: string;
  destination: string;
  address: string;
  startAt: string;
  endAt: string;
  capacity: string;
  minParticipants: string;
  requiresApproval: boolean;
  priceType: string;
  priceText: string;
};

export type CreateActivityState = {
  formError?: string;
  fieldErrors?: Record<string, string[]>;
  values?: CreateActivityFormValues;
  version?: number;
};

function getTimeZoneOffsetMinutes(date: Date, timeZone: string) {
  const offsetName = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
  })
    .formatToParts(date)
    .find((part) => part.type === "timeZoneName")?.value;
  const match = offsetName?.match(
    /^GMT(?:(?<sign>[+-])(?<hours>\d{1,2})(?::(?<minutes>\d{2}))?)?$/,
  );

  if (!match?.groups?.sign) {
    return 0;
  }

  const sign = match.groups.sign === "+" ? 1 : -1;
  const hours = Number(match.groups.hours ?? 0);
  const minutes = Number(match.groups.minutes ?? 0);

  return sign * (hours * 60 + minutes);
}

function parseParisDateTime(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);

  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute] = match;
  const utcGuess = new Date(
    Date.UTC(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
    ),
  );
  const offsetMinutes = getTimeZoneOffsetMinutes(utcGuess, parisTimeZone);
  const date = new Date(utcGuess.getTime() - offsetMinutes * 60_000);

  return Number.isNaN(date.getTime()) ? null : date;
}

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function buildErrorState(
  previousState: CreateActivityState,
  values: CreateActivityFormValues,
  formError: string,
  fieldErrors?: Record<string, string[]>,
): CreateActivityState {
  return {
    formError,
    fieldErrors,
    values,
    version: (previousState.version ?? 0) + 1,
  };
}

export async function createActivityAction(
  previousState: CreateActivityState,
  formData: FormData,
): Promise<CreateActivityState> {
  const locale = getString(formData, "locale") || "zh-CN";
  const rawInput = {
    title: getString(formData, "title"),
    description: getString(formData, "description"),
    itinerary: getString(formData, "itinerary"),
    type: getString(formData, "type"),
    category: getString(formData, "category"),
    otherCategoryText: getString(formData, "otherCategoryText"),
    city: getString(formData, "city"),
    destination: getString(formData, "destination"),
    address: getString(formData, "address"),
    startAt: getString(formData, "startAt"),
    endAt: getString(formData, "endAt"),
    capacity: getString(formData, "capacity"),
    minParticipants: getString(formData, "minParticipants"),
    requiresApproval: formData.get("requiresApproval") === "on",
    priceType: getString(formData, "priceType"),
    priceText: getString(formData, "priceText"),
  };

  const result = createActivitySchema.safeParse(rawInput);

  if (!result.success) {
    const flattened = result.error.flatten();

    return buildErrorState(
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
    return buildErrorState(previousState, rawInput, "开始时间格式无效。", {
      startAt: ["请选择有效的开始时间"],
    });
  }

  if (result.data.endAt && !endAt) {
    return buildErrorState(previousState, rawInput, "结束时间格式无效。", {
      endAt: ["请选择有效的结束时间"],
    });
  }

  if (startAt < new Date()) {
    return buildErrorState(
      previousState,
      rawInput,
      "开始时间不能早于当前时间。",
      {
        startAt: ["请选择未来的开始时间"],
      },
    );
  }

  if (endAt && endAt <= startAt) {
    return buildErrorState(
      previousState,
      rawInput,
      "结束时间必须晚于开始时间。",
      {
        endAt: ["结束时间必须晚于开始时间"],
      },
    );
  }

  let activityId: string;
  const profile = await ensureCurrentUserProfile(locale);
  const description =
    result.data.category === "OTHER" && result.data.otherCategoryText
      ? `其他主题：${result.data.otherCategoryText}\n\n${result.data.description}`
      : result.data.description;

  try {
    const activity = await prisma.activity.create({
      data: {
        title: result.data.title,
        description,
        itinerary: result.data.itinerary,
        type: result.data.type,
        category: result.data.category,
        city: result.data.city,
        destination: result.data.destination,
        address: result.data.address,
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

    return buildErrorState(
      previousState,
      rawInput,
      "创建活动失败，请稍后重试。",
    );
  }

  redirect(withLocale(locale, `/activities/${activityId}`));
}
