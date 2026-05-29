"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { withLocale } from "@/lib/routes";
import { getDirectMessagesCopy } from "../copy";
import {
  DirectMessageDomainError,
  directMessageBodyMaxLength,
  getOrCreateDirectConversation,
  sendDirectMessage,
  sendDirectMessageToFriend,
} from "../services/directMessages";

export type DirectMessageActionState = {
  ok?: boolean;
  conversationId?: string;
  messageId?: string;
  formError?: string;
  fieldErrors?: Record<string, string[]>;
  values?: {
    body?: string;
  };
};

const createDirectConversationSchema = z.object({
  locale: z.string().min(1).default("zh-CN"),
  friendProfileId: z.string().min(1),
});

const sendDirectMessageSchema = z.object({
  locale: z.string().min(1).default("zh-CN"),
  conversationId: z.string().min(1),
  body: z.string().trim().min(1).max(directMessageBodyMaxLength),
});

const sendDirectMessageToFriendSchema = z.object({
  locale: z.string().min(1).default("zh-CN"),
  friendProfileId: z.string().min(1),
  body: z.string().trim().min(1).max(directMessageBodyMaxLength),
});

function getString(formData: FormData, key: string) {
  const value = formData.get(key);

  return typeof value === "string" ? value : "";
}

function getActionErrorMessage(locale: string, error: unknown) {
  const t = getDirectMessagesCopy(locale);

  if (error instanceof DirectMessageDomainError) {
    return t.errors[error.code];
  }

  return t.failed;
}

function refreshConversation(locale: string, conversationId?: string) {
  revalidatePath(withLocale(locale, "/messages"));

  if (conversationId) {
    revalidatePath(withLocale(locale, `/messages/${conversationId}`));
  }
}

export async function createDirectConversationAction(
  _previousState: DirectMessageActionState,
  formData: FormData,
): Promise<DirectMessageActionState> {
  const rawInput = {
    locale: getString(formData, "locale") || "zh-CN",
    friendProfileId: getString(formData, "friendProfileId"),
  };
  const result = createDirectConversationSchema.safeParse(rawInput);
  const t = getDirectMessagesCopy(rawInput.locale);

  if (!result.success) {
    return {
      formError: t.invalidRequest,
      fieldErrors: result.error.flatten().fieldErrors,
    };
  }

  try {
    const profile = await ensureCurrentUserProfile(result.data.locale);
    const conversation = await getOrCreateDirectConversation({
      currentUserProfileId: profile.id,
      friendProfileId: result.data.friendProfileId,
    });

    refreshConversation(result.data.locale, conversation.id);

    return {
      ok: true,
      conversationId: conversation.id,
    };
  } catch (error) {
    console.error("Failed to create direct conversation", error);

    return {
      formError: getActionErrorMessage(result.data.locale, error),
    };
  }
}

export async function sendDirectMessageAction(
  _previousState: DirectMessageActionState,
  formData: FormData,
): Promise<DirectMessageActionState> {
  const rawInput = {
    locale: getString(formData, "locale") || "zh-CN",
    conversationId: getString(formData, "conversationId"),
    body: getString(formData, "body"),
  };
  const result = sendDirectMessageSchema.safeParse(rawInput);
  const t = getDirectMessagesCopy(rawInput.locale);

  if (!result.success) {
    return {
      formError: t.invalidRequest,
      fieldErrors: result.error.flatten().fieldErrors,
      values: {
        body: rawInput.body,
      },
    };
  }

  try {
    const profile = await ensureCurrentUserProfile(result.data.locale);
    const { conversation, message } = await sendDirectMessage({
      currentUserProfileId: profile.id,
      conversationId: result.data.conversationId,
      body: result.data.body,
    });

    refreshConversation(result.data.locale, conversation.id);

    return {
      ok: true,
      conversationId: conversation.id,
      messageId: message.id,
      values: {
        body: "",
      },
    };
  } catch (error) {
    console.error("Failed to send direct message", error);

    return {
      formError: getActionErrorMessage(result.data.locale, error),
      values: {
        body: result.data.body,
      },
    };
  }
}

export async function sendDirectMessageToFriendAction(
  _previousState: DirectMessageActionState,
  formData: FormData,
): Promise<DirectMessageActionState> {
  const rawInput = {
    locale: getString(formData, "locale") || "zh-CN",
    friendProfileId: getString(formData, "friendProfileId"),
    body: getString(formData, "body"),
  };
  const result = sendDirectMessageToFriendSchema.safeParse(rawInput);
  const t = getDirectMessagesCopy(rawInput.locale);

  if (!result.success) {
    return {
      formError: t.invalidRequest,
      fieldErrors: result.error.flatten().fieldErrors,
      values: {
        body: rawInput.body,
      },
    };
  }

  try {
    const profile = await ensureCurrentUserProfile(result.data.locale);
    const { conversation, message } = await sendDirectMessageToFriend({
      currentUserProfileId: profile.id,
      friendProfileId: result.data.friendProfileId,
      body: result.data.body,
    });

    refreshConversation(result.data.locale, conversation.id);

    return {
      ok: true,
      conversationId: conversation.id,
      messageId: message.id,
      values: {
        body: "",
      },
    };
  } catch (error) {
    console.error("Failed to send direct message to friend", error);

    return {
      formError: getActionErrorMessage(result.data.locale, error),
      values: {
        body: result.data.body,
      },
    };
  }
}
