import { createSign } from "node:crypto";
import { prisma } from "@/lib/prisma";
import type { NotificationType } from "@prisma/client";
import { getActivityDetailPath } from "@/features/activities/utils/activityRoutes";

const firebaseTokenUrl = "https://oauth2.googleapis.com/token";
const firebaseScope = "https://www.googleapis.com/auth/firebase.messaging";

let cachedAccessToken: {
  expiresAt: number;
  token: string;
} | null = null;

type PushCopyLocale = "zh-CN" | "en" | "fr";

function getFirebaseConfig() {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return {
    clientEmail,
    privateKey,
    projectId,
  };
}

function base64Url(value: string | Buffer) {
  return Buffer.from(value)
    .toString("base64")
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
}

function createServiceAccountJwt(config: {
  clientEmail: string;
  privateKey: string;
}) {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: "RS256",
    typ: "JWT",
  };
  const claimSet = {
    aud: firebaseTokenUrl,
    exp: now + 3600,
    iat: now,
    iss: config.clientEmail,
    scope: firebaseScope,
  };
  const unsigned = `${base64Url(JSON.stringify(header))}.${base64Url(
    JSON.stringify(claimSet),
  )}`;
  const signature = createSign("RSA-SHA256")
    .update(unsigned)
    .sign(config.privateKey);

  return `${unsigned}.${base64Url(signature)}`;
}

async function getFirebaseAccessToken(config: {
  clientEmail: string;
  privateKey: string;
}) {
  const now = Date.now();

  if (cachedAccessToken && cachedAccessToken.expiresAt - 60_000 > now) {
    return cachedAccessToken.token;
  }

  const jwt = createServiceAccountJwt(config);
  const response = await fetch(firebaseTokenUrl, {
    body: new URLSearchParams({
      assertion: jwt,
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
    }),
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`Firebase token request failed: ${response.status}`);
  }

  const payload = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
  };

  if (!payload.access_token) {
    throw new Error("Firebase token response did not include access_token.");
  }

  cachedAccessToken = {
    expiresAt: now + (payload.expires_in ?? 3600) * 1000,
    token: payload.access_token,
  };

  return payload.access_token;
}

function normalizePushLocale(value: string | null): PushCopyLocale {
  if (value === "zh-CN" || value?.toLowerCase().startsWith("zh")) {
    return "zh-CN";
  }

  if (value === "en" || value?.toLowerCase().startsWith("en")) {
    return "en";
  }

  return "fr";
}

function getNotificationPath(input: {
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

function getNotificationCopy(input: {
  activityTitle: string | null;
  actorName: string | null;
  locale: PushCopyLocale;
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

  return {
    body: copy[input.locale][input.type] ?? activityTitle,
    title: "Friemi",
  };
}

function isInvalidTokenResponse(status: number, text: string) {
  return (
    status === 400 ||
    status === 404 ||
    text.includes("UNREGISTERED") ||
    text.includes("INVALID_ARGUMENT")
  );
}

export async function sendMobilePushForNotification(notificationId: string) {
  const config = getFirebaseConfig();

  if (!config) {
    return { ok: false, skipped: true, reason: "FIREBASE_NOT_CONFIGURED" };
  }

  const notification = await prisma.notification.findUnique({
    where: {
      id: notificationId,
    },
    select: {
      activity: {
        select: {
          title: true,
        },
      },
      activityId: true,
      actor: {
        select: {
          nickname: true,
        },
      },
      recipientId: true,
      type: true,
    },
  });

  if (!notification) {
    return { ok: false, skipped: true, reason: "NOTIFICATION_NOT_FOUND" };
  }

  const devices = await prisma.mobileDevice.findMany({
    where: {
      disabledAt: null,
      platform: "ANDROID",
      userProfileId: notification.recipientId,
    },
    select: {
      fcmToken: true,
      locale: true,
    },
  });

  if (devices.length === 0) {
    return { ok: true, sentCount: 0 };
  }

  const accessToken = await getFirebaseAccessToken(config);
  let sentCount = 0;

  for (const device of devices) {
    const locale = normalizePushLocale(device.locale);
    const copy = getNotificationCopy({
      activityTitle: notification.activity?.title ?? null,
      actorName: notification.actor?.nickname ?? null,
      locale,
      type: notification.type,
    });
    const path = getNotificationPath({
      activityId: notification.activityId,
      type: notification.type,
    });
    const response = await fetch(
      `https://fcm.googleapis.com/v1/projects/${config.projectId}/messages:send`,
      {
        body: JSON.stringify({
          message: {
            android: {
              notification: {
                channel_id: "friemi_activity_updates",
              },
            },
            data: {
              notificationId,
              path,
              type: notification.type,
              url: path,
            },
            notification: copy,
            token: device.fcmToken,
          },
        }),
        headers: {
          authorization: `Bearer ${accessToken}`,
          "content-type": "application/json",
        },
        method: "POST",
      },
    );

    if (response.ok) {
      sentCount += 1;
      continue;
    }

    const errorText = await response.text();

    if (isInvalidTokenResponse(response.status, errorText)) {
      await prisma.mobileDevice.updateMany({
        where: {
          fcmToken: device.fcmToken,
        },
        data: {
          disabledAt: new Date(),
        },
      });
    } else {
      console.error("Failed to send mobile push notification", {
        notificationId,
        status: response.status,
        body: errorText,
      });
    }
  }

  return { ok: true, sentCount };
}
