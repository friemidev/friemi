"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getCurrentUserProfileForMutation } from "@/lib/auth";
import { withLocale } from "@/lib/routes";
import { getActivityRoomChatCopy } from "../copy";
import {
  ActivityRoomChatDomainError,
  activityRoomMessageMaxLength,
  deleteActivityRoomMessage,
  sendActivityRoomMessage,
} from "../services/activityRoomChat";

export type ActivityRoomChatActionState = {
  ok?: boolean;
  formError?: string;
  fieldErrors?: Record<string, string[]>;
  messageId?: string;
  values?: {
    body?: string;
  };
};

const sendActivityRoomMessageSchema = z.object({
  activityId: z.string().min(1).max(80),
  body: z.string().trim().min(1).max(activityRoomMessageMaxLength),
  locale: z.string().min(1).max(16).default("zh-CN"),
});

const deleteActivityRoomMessageSchema = z.object({
  activityId: z.string().min(1).max(80),
  locale: z.string().min(1).max(16).default("zh-CN"),
  messageId: z.string().min(1).max(80),
});

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function getActionErrorMessage(locale: string, error: unknown) {
  const t = getActivityRoomChatCopy(locale);

  if (error instanceof ActivityRoomChatDomainError) {
    return t.errors[error.code];
  }

  return t.sendFailed;
}

function revalidateActivityRoom(locale: string, activityId: string) {
  revalidatePath(withLocale(locale, `/lobby/${activityId}`));
  revalidatePath(withLocale(locale, `/lobby/${activityId}/room`));
}

export async function sendActivityRoomMessageAction(
  _previousState: ActivityRoomChatActionState,
  formData: FormData,
): Promise<ActivityRoomChatActionState> {
  const rawInput = {
    activityId: getString(formData, "activityId"),
    body: getString(formData, "body"),
    locale: getString(formData, "locale") || "zh-CN",
  };
  const result = sendActivityRoomMessageSchema.safeParse(rawInput);
  const t = getActivityRoomChatCopy(rawInput.locale);

  if (!result.success) {
    return {
      fieldErrors: result.error.flatten().fieldErrors,
      formError: t.invalidRequest,
      values: {
        body: rawInput.body,
      },
    };
  }

  try {
    const profile = await getCurrentUserProfileForMutation(
      result.data.locale,
      `/lobby/${result.data.activityId}/room`,
    );
    const message = await sendActivityRoomMessage({
      activityId: result.data.activityId,
      body: result.data.body,
      senderId: profile.id,
    });

    revalidateActivityRoom(result.data.locale, result.data.activityId);

    return {
      ok: true,
      messageId: message.id,
    };
  } catch (error) {
    console.error("Failed to send activity room message", error);

    return {
      formError: getActionErrorMessage(result.data.locale, error),
      values: {
        body: result.data.body,
      },
    };
  }
}

export async function deleteActivityRoomMessageAction(
  _previousState: ActivityRoomChatActionState,
  formData: FormData,
): Promise<ActivityRoomChatActionState> {
  const rawInput = {
    activityId: getString(formData, "activityId"),
    locale: getString(formData, "locale") || "zh-CN",
    messageId: getString(formData, "messageId"),
  };
  const result = deleteActivityRoomMessageSchema.safeParse(rawInput);
  const t = getActivityRoomChatCopy(rawInput.locale);

  if (!result.success) {
    return {
      fieldErrors: result.error.flatten().fieldErrors,
      formError: t.invalidRequest,
    };
  }

  try {
    const profile = await getCurrentUserProfileForMutation(
      result.data.locale,
      `/lobby/${result.data.activityId}/room`,
    );

    await deleteActivityRoomMessage({
      actorId: profile.id,
      messageId: result.data.messageId,
    });
    revalidateActivityRoom(result.data.locale, result.data.activityId);

    return {
      ok: true,
      messageId: result.data.messageId,
    };
  } catch (error) {
    console.error("Failed to delete activity room message", error);

    return {
      formError:
        error instanceof ActivityRoomChatDomainError
          ? t.errors[error.code]
          : t.deleteFailed,
    };
  }
}
