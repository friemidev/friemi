"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { normalizeAnalyticsLocale } from "@/features/analytics/events";
import { queueAnalyticsEvent } from "@/features/analytics/server";
import { ensureCurrentUserProfile } from "@/lib/auth";
import { withLocale } from "@/lib/routes";
import { getDirectMessagesCopy } from "../copy";
import {
  DirectMessageDomainError,
  directMessageBodyMaxLength,
  getOrCreateActivityOrganizerConversation,
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

const createActivityOrganizerConversationSchema = z.object({
  locale: z.string().min(1).default("zh-CN"),
  activityId: z.string().min(1),
  organizerProfileId: z.string().min(1),
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

function trackConversationOpened({
  conversationId,
  locale,
  sourceSurface,
  userProfileId,
}: {
  conversationId: string;
  locale: string;
  sourceSurface: "activity_detail" | "messages";
  userProfileId: string;
}) {
  queueAnalyticsEvent(
    {
      locale: normalizeAnalyticsLocale(locale),
      name: "conversation_opened",
      route:
        sourceSurface === "activity_detail"
          ? `/${locale}/activities`
          : `/${locale}/messages/${conversationId}`,
      entityId: conversationId,
      entityType: "conversation",
      sourceSurface,
    },
    {
      userProfileId,
    },
  );
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

    trackConversationOpened({
      conversationId: conversation.id,
      locale: result.data.locale,
      sourceSurface: "messages",
      userProfileId: profile.id,
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

export async function openDirectConversationAction(
  formData: FormData,
): Promise<void> {
  const rawInput = {
    locale: getString(formData, "locale") || "zh-CN",
    friendProfileId: getString(formData, "friendProfileId"),
  };
  const result = createDirectConversationSchema.safeParse(rawInput);

  if (!result.success) {
    redirect(withLocale(rawInput.locale, "/friends"));
  }

  let conversationId: string;

  try {
    const profile = await ensureCurrentUserProfile(result.data.locale);
    const conversation = await getOrCreateDirectConversation({
      currentUserProfileId: profile.id,
      friendProfileId: result.data.friendProfileId,
    });

    conversationId = conversation.id;
    trackConversationOpened({
      conversationId,
      locale: result.data.locale,
      sourceSurface: "messages",
      userProfileId: profile.id,
    });
    refreshConversation(result.data.locale, conversation.id);
  } catch (error) {
    console.error("Failed to open direct conversation", error);
    redirect(withLocale(result.data.locale, "/messages"));
  }

  redirect(withLocale(result.data.locale, `/messages/${conversationId}`));
}

export async function openActivityOrganizerConversationAction(
  formData: FormData,
): Promise<void> {
  const rawInput = {
    locale: getString(formData, "locale") || "zh-CN",
    activityId: getString(formData, "activityId"),
    organizerProfileId: getString(formData, "organizerProfileId"),
  };
  const result = createActivityOrganizerConversationSchema.safeParse(rawInput);

  if (!result.success) {
    redirect(withLocale(rawInput.locale, "/activities"));
  }

  const profile = await ensureCurrentUserProfile(result.data.locale);
  let conversationId: string;

  try {
    const conversation = await getOrCreateActivityOrganizerConversation({
      currentUserProfileId: profile.id,
      organizerProfileId: result.data.organizerProfileId,
      activityId: result.data.activityId,
    });

    conversationId = conversation.id;
    queueAnalyticsEvent(
      {
        locale: normalizeAnalyticsLocale(result.data.locale),
        name: "organizer_contact_clicked",
        route: `/${result.data.locale}/activities/${result.data.activityId}`,
        entityId: result.data.activityId,
        entityType: "team",
        sourceSurface: "activity_detail",
      },
      {
        userProfileId: profile.id,
      },
    );
    trackConversationOpened({
      conversationId,
      locale: result.data.locale,
      sourceSurface: "activity_detail",
      userProfileId: profile.id,
    });
    refreshConversation(result.data.locale, conversation.id);
  } catch (error) {
    console.error("Failed to open activity organizer conversation", error);
    redirect(
      withLocale(result.data.locale, `/activities/${result.data.activityId}`),
    );
  }

  redirect(withLocale(result.data.locale, `/messages/${conversationId}`));
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

    queueAnalyticsEvent(
      {
        locale: normalizeAnalyticsLocale(result.data.locale),
        name: "message_sent",
        route: `/${result.data.locale}/messages/${conversation.id}`,
        entityId: conversation.id,
        entityType: "conversation",
        sourceSurface: "messages",
        properties: {
          body_length: result.data.body.length,
        },
      },
      {
        userProfileId: profile.id,
      },
    );
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

    queueAnalyticsEvent(
      {
        locale: normalizeAnalyticsLocale(result.data.locale),
        name: "message_sent",
        route: `/${result.data.locale}/messages/${conversation.id}`,
        entityId: conversation.id,
        entityType: "conversation",
        sourceSurface: "messages",
        properties: {
          body_length: result.data.body.length,
          send_mode: "friend_shortcut",
        },
      },
      {
        userProfileId: profile.id,
      },
    );
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
