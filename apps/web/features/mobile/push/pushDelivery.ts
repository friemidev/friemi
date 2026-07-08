import type { NotificationType } from "@prisma/client";
import { getActivityDetailPath } from "@/features/activities/utils/activityRoutes";

export type PushCopyLocale = "zh-CN" | "en" | "fr";

export function normalizePushLocale(value: string | null): PushCopyLocale {
  if (value === "zh-CN" || value?.toLowerCase().startsWith("zh")) {
    return "zh-CN";
  }

  if (value === "en" || value?.toLowerCase().startsWith("en")) {
    return "en";
  }

  return "fr";
}

export function getNotificationPath(input: {
  activityId: string | null;
  type: NotificationType;
}) {
  if (input.activityId) {
    if (
      input.type === "ACTIVITY_COMMENTED" ||
      input.type === "COMMENT_REPLY"
    ) {
      return `${getActivityDetailPath(input.activityId)}#comments`;
    }

    if (input.type === "PARTICIPATION_PENDING") {
      return `${getActivityDetailPath(input.activityId)}#participation-approval`;
    }

    return getActivityDetailPath(input.activityId);
  }

  if (input.type === "DIRECT_MESSAGE") {
    return "/messages";
  }

  return "/notifications";
}

const directMessagePreviewMaxLength = 120;

function truncateMessagePreview(body: string) {
  const trimmed = body.trim();

  return trimmed.length > directMessagePreviewMaxLength
    ? `${trimmed.slice(0, directMessagePreviewMaxLength).trim()}…`
    : trimmed;
}

export function getNotificationCopy(input: {
  activityTitle: string | null;
  actorName: string | null;
  locale: PushCopyLocale;
  messageBody?: string | null;
  type: NotificationType;
}) {
  const activityTitle =
    input.activityTitle ||
    (input.locale === "zh-CN"
      ? "你的活动"
      : input.locale === "en"
        ? "your plan"
        : "votre sortie");
  const actorName =
    input.actorName ||
    (input.locale === "zh-CN"
      ? "有人"
      : input.locale === "en"
        ? "Someone"
        : "Quelqu'un");

  const copy: Record<PushCopyLocale, Partial<Record<NotificationType, string>>> = {
    "zh-CN": {
      ACTIVITY_ANNOUNCEMENT: `${activityTitle} 有新公告`,
      ACTIVITY_CANCELLED: `${activityTitle} 已取消`,
      ACTIVITY_COMMENTED: `${actorName} 评论了 ${activityTitle}`,
      ACTIVITY_UPDATED: `${activityTitle} 有更新`,
      COMMENT_REPLY: `${actorName} 回复了你`,
      DIRECT_MESSAGE: `${actorName} 给你发来新消息`,
      FRIEND_REQUEST: `${actorName} 想加你为好友`,
      PARTICIPATION_APPROVED: `${activityTitle} 已通过你的报名`,
      PARTICIPATION_CANCELLED: `${actorName} 取消了报名`,
      PARTICIPATION_CONFIRMED: `${activityTitle} 报名已确认`,
      PARTICIPATION_PENDING: `${actorName} 提交了报名申请`,
      PARTICIPATION_REJECTED: `${activityTitle} 未通过报名`,
      REPORT_CREATED: "有新的举报需要处理",
    },
    en: {
      ACTIVITY_ANNOUNCEMENT: `${activityTitle} has a new announcement`,
      ACTIVITY_CANCELLED: `${activityTitle} was cancelled`,
      ACTIVITY_COMMENTED: `${actorName} commented on ${activityTitle}`,
      ACTIVITY_UPDATED: `${activityTitle} was updated`,
      COMMENT_REPLY: `${actorName} replied to you`,
      DIRECT_MESSAGE: `${actorName} sent you a message`,
      FRIEND_REQUEST: `${actorName} sent you a friend request`,
      PARTICIPATION_APPROVED: `You're approved for ${activityTitle}`,
      PARTICIPATION_CANCELLED: `${actorName} cancelled their join`,
      PARTICIPATION_CONFIRMED: `You're confirmed for ${activityTitle}`,
      PARTICIPATION_PENDING: `${actorName} asked to join`,
      PARTICIPATION_REJECTED: `${activityTitle} could not approve you`,
      REPORT_CREATED: "A new report needs review",
    },
    fr: {
      ACTIVITY_ANNOUNCEMENT: `${activityTitle} a une nouvelle annonce`,
      ACTIVITY_CANCELLED: `${activityTitle} a été annulée`,
      ACTIVITY_COMMENTED: `${actorName} a commenté ${activityTitle}`,
      ACTIVITY_UPDATED: `${activityTitle} a été mise à jour`,
      COMMENT_REPLY: `${actorName} vous a répondu`,
      DIRECT_MESSAGE: `${actorName} vous a envoyé un message`,
      FRIEND_REQUEST: `${actorName} vous a ajouté en ami`,
      PARTICIPATION_APPROVED: `Votre inscription à ${activityTitle} est validée`,
      PARTICIPATION_CANCELLED: `${actorName} a annulé son inscription`,
      PARTICIPATION_CONFIRMED: `Votre inscription à ${activityTitle} est confirmée`,
      PARTICIPATION_PENDING: `${actorName} demande à participer`,
      PARTICIPATION_REJECTED: `${activityTitle} n'a pas pu vous accepter`,
      REPORT_CREATED: "Un nouveau signalement est à traiter",
    },
  };

  if (input.type === "DIRECT_MESSAGE" && input.messageBody?.trim()) {
    return {
      body: truncateMessagePreview(input.messageBody),
      title: actorName,
    };
  }

  return {
    body: copy[input.locale][input.type] ?? activityTitle,
    title: "Friemi",
  };
}

export function isInvalidFirebaseTokenResponse(status: number, text: string) {
  return (
    status === 400 ||
    status === 404 ||
    text.includes("UNREGISTERED") ||
    text.includes("INVALID_ARGUMENT")
  );
}

export function getAPNsErrorReason(text: string) {
  try {
    const payload = JSON.parse(text) as { reason?: unknown };
    return typeof payload.reason === "string" ? payload.reason : null;
  } catch {
    return null;
  }
}

export function isInvalidAPNsTokenResponse(status: number, text: string) {
  if (status === 410) {
    return true;
  }

  const reason = getAPNsErrorReason(text);

  return (
    reason === "BadDeviceToken" ||
    reason === "DeviceTokenNotForTopic" ||
    reason === "Unregistered"
  );
}
