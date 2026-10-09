"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { OPEN_LOBBY_ACTIVITIES_TAG } from "@/features/activities/queries/getActivityLobby";
import { isCurrentUserAdmin } from "@/lib/admin-auth";
import { getCurrentUserProfileForMutation } from "@/lib/auth";
import { withLocale } from "@/lib/routes";
import {
  cancelBooking,
  reviewBooking,
  saveBookingSettings,
  setBookingAccess,
  submitBooking,
  type BookingServiceResult,
} from "./service";
import type { BookingActionState, BookingScheduleMode } from "./types";

export type { BookingActionState } from "./types";

function field(data: FormData, name: string) {
  const value = data.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function values(data: FormData, name: string) {
  return data
    .getAll(name)
    .flatMap((value) =>
      typeof value === "string" ? value.split(/[\s,;]+/).filter(Boolean) : [],
    );
}

function localeOf(data: FormData): "en" | "fr" | "zh-CN" {
  const locale = field(data, "locale");
  return locale === "en" || locale === "fr" ? locale : "zh-CN";
}

const messages = {
  "zh-CN": {
    INVALID: "请检查日期、人数、联系电话和填写内容。",
    PAST_DATE: "请选择今天或未来的日期。",
    NOT_FOUND: "这笔预约不存在或不可访问。",
    FORBIDDEN: "当前账户没有操作权限。",
    CLOSED: "当前日期暂不开放预约，请选择其他日期。",
    STALE: "预约状态已变化，请刷新页面。",
    FAILED: "暂时无法完成操作，请稍后重试。",
  },
  en: {
    INVALID: "Check the date, party size, phone number and details.",
    PAST_DATE: "Choose today or a future date.",
    NOT_FOUND: "This reservation is unavailable.",
    FORBIDDEN: "This account cannot perform this action.",
    CLOSED: "Reservations are unavailable for this date. Choose another date.",
    STALE: "The reservation changed. Refresh the page.",
    FAILED: "This action could not be completed. Try again shortly.",
  },
  fr: {
    INVALID:
      "Vérifiez la date, le nombre de personnes, le téléphone et les informations.",
    PAST_DATE: "Choisissez aujourd’hui ou une date future.",
    NOT_FOUND: "Cette réservation est indisponible.",
    FORBIDDEN: "Ce compte ne peut pas effectuer cette action.",
    CLOSED:
      "Les réservations ne sont pas ouvertes à cette date. Choisissez une autre date.",
    STALE: "La réservation a changé. Actualisez la page.",
    FAILED: "Impossible de terminer cette action. Réessayez dans un instant.",
  },
};

function state(
  result: BookingServiceResult,
  locale: keyof typeof messages,
): BookingActionState {
  const error = messages[locale][result.status as keyof typeof messages.en];
  return {
    ...(error ? { error } : { success: true }),
    bookingId: result.bookingId,
    activityId: result.activityId,
  };
}

function refresh(result: BookingServiceResult) {
  // The same data appears in all locales, including notification landing pages.
  for (const locale of ["zh-CN", "en", "fr"]) {
    for (const path of [
      "/profile/store",
      "/profile/bookings",
      "/admin/merchants",
      "/merchants",
      "/activities",
      "/lobby",
    ]) {
      revalidatePath(withLocale(locale, path), "layout");
    }
    if (result.activityId)
      revalidatePath(
        withLocale(locale, `/activities/${result.activityId}`),
        "layout",
      );
  }
  revalidateTag(OPEN_LOBBY_ACTIVITIES_TAG);
}

async function run(
  data: FormData,
  path: string,
  operation: (actorProfileId: string) => Promise<BookingServiceResult>,
) {
  const locale = localeOf(data);
  const profile = await getCurrentUserProfileForMutation(locale, path);
  if (profile.status !== "ACTIVE")
    return state({ status: "FORBIDDEN" }, locale);
  try {
    const result = await operation(profile.id);
    const next = state(result, locale);
    if (next.success) refresh(result);
    return next;
  } catch (error) {
    // Avoid logging submitted contact details from Prisma error context.
    console.error(
      "Merchant booking action failed",
      error instanceof Error ? error.name : "UnknownError",
    );
    return { error: messages[locale].FAILED };
  }
}

export async function saveBookingSettingsAction(
  _previous: BookingActionState,
  data: FormData,
): Promise<BookingActionState> {
  return run(data, "/profile/store/bookings/settings", (actorProfileId) =>
    saveBookingSettings({
      actorProfileId,
      title: field(data, "title"),
      description: field(data, "description"),
      coverImageUrl: field(data, "coverImageUrl"),
      enabled: ["true", "on", "1"].includes(field(data, "enabled")),
      scheduleMode: field(data, "scheduleMode") as BookingScheduleMode,
      startDate: field(data, "startDate"),
      endDate: field(data, "endDate") || null,
      weekdays: values(data, "weekdays").map(Number),
      specificDates: values(data, "specificDates"),
      closedDates: values(data, "closedDates"),
    }),
  );
}

export async function setBookingAccessAction(
  _previous: BookingActionState,
  data: FormData,
): Promise<BookingActionState> {
  const locale = localeOf(data);
  if (!(await isCurrentUserAdmin()))
    return state({ status: "FORBIDDEN" }, locale);
  if (!["true", "false"].includes(field(data, "enabled")))
    return state({ status: "INVALID" }, locale);
  return run(data, "/admin/merchants", (actorProfileId) =>
    setBookingAccess({
      actorProfileId,
      isAdmin: true,
      merchantId: field(data, "merchantId"),
      enabled: field(data, "enabled") === "true",
    }),
  );
}

export async function submitBookingAction(
  _previous: BookingActionState,
  data: FormData,
): Promise<BookingActionState> {
  const activityId = field(data, "activityId");
  return run(data, `/activities/${activityId}`, (actorProfileId) =>
    submitBooking({
      actorProfileId,
      activityId,
      date: field(data, "date"),
      partySize: Number(field(data, "partySize")),
      contactName: field(data, "contactName"),
      contactPhone: field(data, "contactPhone"),
      note: field(data, "note"),
    }),
  );
}

export async function reviewBookingAction(
  _previous: BookingActionState,
  data: FormData,
): Promise<BookingActionState> {
  const decision = field(data, "decision");
  if (decision !== "accept" && decision !== "reject")
    return state({ status: "INVALID" }, localeOf(data));
  const bookingId = field(data, "bookingId");
  return run(
    data,
    `/profile/store/bookings/reservations/${bookingId}`,
    (actorProfileId) =>
      reviewBooking({
        actorProfileId,
        bookingId,
        decision,
        reason: field(data, "reason"),
      }),
  );
}

export async function cancelBookingAction(
  _previous: BookingActionState,
  data: FormData,
): Promise<BookingActionState> {
  const bookingId = field(data, "bookingId");
  return run(data, `/profile/bookings/${bookingId}`, (actorProfileId) =>
    cancelBooking({ actorProfileId, bookingId }),
  );
}
