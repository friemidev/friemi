"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { OPEN_LOBBY_ACTIVITIES_TAG } from "@/features/activities/queries/getActivityLobby";
import { isCurrentUserAdmin } from "@/lib/admin-auth";
import { getCurrentUserProfileForMutation } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";
import { getPublicResidencySlot } from "./queries";
import {
  cancelResidencySignup,
  cancelResidencySlot,
  cancelResidencySlotAsAdmin,
  publishResidencySlot,
  requestResidencySlot,
  reviewResidencySlot,
  signupForResidencySlot,
  type ResidencyServiceResult,
  type ResidencyServiceStatus,
} from "./service";

export type ResidencyActionState = {
  success?: boolean;
  error?: string;
  slotId?: string;
  activityId?: string;
};

function readString(data: FormData, key: string) {
  const value = data.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getLocale(data: FormData) {
  const value = readString(data, "locale");
  return value === "en" || value === "fr" ? value : "zh-CN";
}

const errors: Record<
  "zh-CN" | "en" | "fr",
  Record<ResidencyServiceStatus, string>
> = {
  "zh-CN": {
    CREATED: "已提交预约。",
    CONFIRMED: "已确认预约。",
    REJECTED: "已拒绝预约。",
    CANCELLED: "已取消预约。",
    SIGNED_UP: "报名成功。",
    ALREADY_SIGNED_UP: "你已经报名。",
    SIGNUP_CANCELLED: "已取消报名。",
    PUBLISHED: "已发布聚吧。",
    INVALID: "请检查填写的日期、内容或时间。",
    PAST_DATE: "请选择未来的日期。",
    DATE_TAKEN: "你的门店在这个日期已有有效预约。",
    NOT_FOUND: "预约不存在或已不可见。",
    FORBIDDEN: "当前账户没有操作权限。",
    CLOSED: "这个预约已关闭，无法继续操作。",
    STALE: "预约状态已变化，请刷新页面后重试。",
    FAILED: "操作暂时失败，请稍后重试。",
  },
  en: {
    CREATED: "Reservation submitted.",
    CONFIRMED: "Reservation confirmed.",
    REJECTED: "Reservation declined.",
    CANCELLED: "Reservation cancelled.",
    SIGNED_UP: "You are signed up.",
    ALREADY_SIGNED_UP: "You are already signed up.",
    SIGNUP_CANCELLED: "Your signup was cancelled.",
    PUBLISHED: "Activity published.",
    INVALID: "Check the date, details, or time.",
    PAST_DATE: "Choose a future date.",
    DATE_TAKEN: "Your store already has an active request for this date.",
    NOT_FOUND: "This reservation is unavailable.",
    FORBIDDEN: "This account cannot perform this action.",
    CLOSED: "This reservation is closed.",
    STALE: "The reservation changed. Refresh and try again.",
    FAILED: "The action failed. Try again shortly.",
  },
  fr: {
    CREATED: "Demande envoyée.",
    CONFIRMED: "Réservation confirmée.",
    REJECTED: "Réservation refusée.",
    CANCELLED: "Réservation annulée.",
    SIGNED_UP: "Inscription enregistrée.",
    ALREADY_SIGNED_UP: "Vous êtes déjà inscrit.",
    SIGNUP_CANCELLED: "Inscription annulée.",
    PUBLISHED: "Activité publiée.",
    INVALID: "Vérifiez la date, les informations ou l'heure.",
    PAST_DATE: "Choisissez une date future.",
    DATE_TAKEN: "Votre boutique a déjà une demande active pour cette date.",
    NOT_FOUND: "Cette réservation est introuvable.",
    FORBIDDEN: "Ce compte ne peut pas effectuer cette action.",
    CLOSED: "Cette réservation est fermée.",
    STALE: "La réservation a changé. Actualisez la page.",
    FAILED: "L'action a échoué. Réessayez plus tard.",
  },
};

function toActionState(
  result: ResidencyServiceResult,
  locale: ReturnType<typeof getLocale>,
): ResidencyActionState {
  const successStatuses: ResidencyServiceStatus[] = [
    "CREATED",
    "CONFIRMED",
    "REJECTED",
    "CANCELLED",
    "SIGNED_UP",
    "ALREADY_SIGNED_UP",
    "SIGNUP_CANCELLED",
    "PUBLISHED",
  ];
  return {
    success: successStatuses.includes(result.status),
    ...(successStatuses.includes(result.status)
      ? {}
      : { error: errors[locale][result.status] }),
    slotId: result.slotId,
    activityId: result.activityId,
  };
}

async function refreshResidencyPaths(
  locale: string,
  slotId?: string,
  activityId?: string,
) {
  for (const path of [
    "/profile/bookings",
    "/profile/store/bookings",
    "/admin/merchants/bookings",
    "/merchants",
  ]) {
    revalidatePath(withLocale(locale, path), "layout");
  }
  if (slotId) {
    const slot = await prisma.merchantResidencySlot.findUnique({
      where: { id: slotId },
      select: { merchantId: true },
    });
    if (slot) {
      for (const path of [
        `/profile/store/bookings/${slotId}`,
        `/profile/store/bookings/${slotId}/publish`,
        `/admin/merchants/bookings/${slotId}`,
        `/merchants/${slot.merchantId}`,
        `/merchants/${slot.merchantId}/bookings`,
        `/merchants/${slot.merchantId}/bookings/${slotId}`,
      ]) {
        revalidatePath(withLocale(locale, path), "layout");
      }
    }
  }
  if (activityId) {
    revalidateTag(OPEN_LOBBY_ACTIVITIES_TAG);
    revalidatePath(withLocale(locale, `/activities/${activityId}`), "layout");
    revalidatePath(withLocale(locale, "/activities"), "layout");
    revalidatePath(withLocale(locale, "/lobby"), "layout");
  }
}

async function currentActiveProfile(locale: string, path: string) {
  const profile = await getCurrentUserProfileForMutation(locale, path);
  return profile.status === "ACTIVE" ? profile : null;
}

export async function submitResidencyRequestAction(
  _previousState: ResidencyActionState,
  formData: FormData,
): Promise<ResidencyActionState> {
  const locale = getLocale(formData);
  const profile = await currentActiveProfile(
    locale,
    "/profile/store/bookings/new",
  );
  if (!profile) return toActionState({ status: "FORBIDDEN" }, locale);
  try {
    const result = await requestResidencySlot({
      actorProfileId: profile.id,
      date: readString(formData, "date"),
      title: readString(formData, "title"),
      description: readString(formData, "description"),
    });
    if (result.status === "CREATED")
      await refreshResidencyPaths(locale, result.slotId);
    return toActionState(result, locale);
  } catch (error) {
    console.error("Failed to request merchant residency", error);
    return { error: errors[locale].FAILED };
  }
}

export async function reviewResidencyRequestAction(
  _previousState: ResidencyActionState,
  formData: FormData,
): Promise<ResidencyActionState> {
  const locale = getLocale(formData);
  const slotId = readString(formData, "slotId");
  const decision = readString(formData, "decision");
  if (!slotId || (decision !== "approve" && decision !== "reject")) {
    return toActionState({ status: "INVALID" }, locale);
  }
  if (!(await isCurrentUserAdmin())) {
    return toActionState({ status: "FORBIDDEN" }, locale);
  }
  const profile = await currentActiveProfile(
    locale,
    "/admin/merchants/bookings",
  );
  if (!profile) return toActionState({ status: "FORBIDDEN" }, locale);
  try {
    const result = await reviewResidencySlot({
      actorProfileId: profile.id,
      isAdmin: true,
      slotId,
      decision,
      reason: readString(formData, "reason"),
    });
    if (result.status === "CONFIRMED" || result.status === "REJECTED") {
      await refreshResidencyPaths(locale, result.slotId);
    }
    return toActionState(result, locale);
  } catch (error) {
    console.error("Failed to review merchant residency", error);
    return { error: errors[locale].FAILED };
  }
}

export async function cancelResidencyRequestAction(
  _previousState: ResidencyActionState,
  formData: FormData,
): Promise<ResidencyActionState> {
  const locale = getLocale(formData);
  const slotId = readString(formData, "slotId");
  if (!slotId) return toActionState({ status: "INVALID" }, locale);
  const profile = await currentActiveProfile(locale, "/profile/store/bookings");
  if (!profile) return toActionState({ status: "FORBIDDEN" }, locale);
  try {
    const result = await cancelResidencySlot({
      actorProfileId: profile.id,
      slotId,
    });
    if (result.status === "CANCELLED")
      await refreshResidencyPaths(locale, result.slotId);
    return toActionState(result, locale);
  } catch (error) {
    console.error("Failed to cancel merchant residency", error);
    return { error: errors[locale].FAILED };
  }
}

export async function cancelResidencyRequestAdminAction(
  _previousState: ResidencyActionState,
  formData: FormData,
): Promise<ResidencyActionState> {
  const locale = getLocale(formData);
  const slotId = readString(formData, "slotId");
  if (!slotId) return toActionState({ status: "INVALID" }, locale);
  if (!(await isCurrentUserAdmin())) {
    return toActionState({ status: "FORBIDDEN" }, locale);
  }
  const profile = await currentActiveProfile(
    locale,
    `/admin/merchants/bookings/${slotId}`,
  );
  if (!profile) return toActionState({ status: "FORBIDDEN" }, locale);
  try {
    const result = await cancelResidencySlotAsAdmin({
      actorProfileId: profile.id,
      slotId,
      isAdmin: true,
    });
    if (result.status === "CANCELLED") {
      await refreshResidencyPaths(locale, result.slotId);
    }
    return toActionState(result, locale);
  } catch (error) {
    console.error(
      "Failed to cancel merchant residency as administrator",
      error,
    );
    return { error: errors[locale].FAILED };
  }
}

export async function signupResidencyAction(
  _previousState: ResidencyActionState,
  formData: FormData,
): Promise<ResidencyActionState> {
  const locale = getLocale(formData);
  const slotId = readString(formData, "slotId");
  if (!slotId) return toActionState({ status: "INVALID" }, locale);
  const slot = await getPublicResidencySlot(slotId);
  if (!slot) return toActionState({ status: "NOT_FOUND" }, locale);
  const profile = await currentActiveProfile(
    locale,
    `/merchants/${slot.merchant.id}/bookings/${slotId}`,
  );
  if (!profile) return toActionState({ status: "FORBIDDEN" }, locale);
  try {
    const result = await signupForResidencySlot({
      actorProfileId: profile.id,
      slotId,
    });
    if (result.status === "SIGNED_UP")
      await refreshResidencyPaths(locale, result.slotId);
    return toActionState(result, locale);
  } catch (error) {
    console.error("Failed to sign up for merchant residency", error);
    return { error: errors[locale].FAILED };
  }
}

export async function cancelResidencySignupAction(
  _previousState: ResidencyActionState,
  formData: FormData,
): Promise<ResidencyActionState> {
  const locale = getLocale(formData);
  const slotId = readString(formData, "slotId");
  if (!slotId) return toActionState({ status: "INVALID" }, locale);
  const profile = await currentActiveProfile(locale, "/profile/bookings");
  if (!profile) return toActionState({ status: "FORBIDDEN" }, locale);
  const slot = await getPublicResidencySlot(slotId, profile.id);
  if (!slot) return toActionState({ status: "NOT_FOUND" }, locale);
  try {
    const result = await cancelResidencySignup({
      actorProfileId: profile.id,
      slotId,
    });
    if (result.status === "SIGNUP_CANCELLED")
      await refreshResidencyPaths(locale, result.slotId);
    return toActionState(result, locale);
  } catch (error) {
    console.error("Failed to cancel residency signup", error);
    return { error: errors[locale].FAILED };
  }
}

export async function publishResidencyActivityAction(
  _previousState: ResidencyActionState,
  formData: FormData,
): Promise<ResidencyActionState> {
  const locale = getLocale(formData);
  const slotId = readString(formData, "slotId");
  if (!slotId) return toActionState({ status: "INVALID" }, locale);
  const profile = await currentActiveProfile(locale, "/profile/store/bookings");
  if (!profile) return toActionState({ status: "FORBIDDEN" }, locale);
  try {
    const result = await publishResidencySlot({
      actorProfileId: profile.id,
      slotId,
      startTime: readString(formData, "startTime"),
      address: readString(formData, "address"),
    });
    if (result.status === "PUBLISHED") {
      await refreshResidencyPaths(locale, result.slotId, result.activityId);
    }
    return toActionState(result, locale);
  } catch (error) {
    console.error("Failed to publish merchant residency activity", error);
    return { error: errors[locale].FAILED };
  }
}
