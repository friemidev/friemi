import type { ActivityRoomChatErrorCode } from "./services/activityRoomChat";

type ActivityRoomChatCopy = {
  deleteFailed: string;
  errors: Record<ActivityRoomChatErrorCode, string>;
  invalidRequest: string;
  sendFailed: string;
};

export function getActivityRoomChatCopy(locale: string): ActivityRoomChatCopy {
  if (locale === "fr") {
    return {
      deleteFailed: "Message impossible à supprimer pour le moment.",
      invalidRequest: "Requête invalide.",
      sendFailed: "Message impossible à envoyer pour le moment.",
      errors: {
        ACTIVITY_NOT_FOUND: "Cette sortie n'est plus disponible.",
        PUBLIC_EVENT_UNAVAILABLE:
          "La discussion est disponible uniquement dans les groupes Friemi.",
        NOT_ROOM_MEMBER: "Rejoignez le groupe pour lire la discussion.",
        ACTIVITY_CANCELLED:
          "Ce groupe est annulé. La discussion est en lecture seule.",
        ACTIVITY_ENDED:
          "Ce groupe est terminé. La discussion est en lecture seule.",
        EMPTY_BODY: "Le message ne peut pas être vide.",
        BODY_TOO_LONG: "Le message est trop long.",
        MESSAGE_NOT_FOUND: "Ce message n'est plus disponible.",
        DELETE_FORBIDDEN: "Vous ne pouvez pas supprimer ce message.",
      },
    };
  }

  if (locale === "en") {
    return {
      deleteFailed: "Message could not be deleted right now.",
      invalidRequest: "Invalid request.",
      sendFailed: "Message could not be sent right now.",
      errors: {
        ACTIVITY_NOT_FOUND: "This activity is no longer available.",
        PUBLIC_EVENT_UNAVAILABLE:
          "Room chat is available only for Friemi groups.",
        NOT_ROOM_MEMBER: "Join the group to read the room chat.",
        ACTIVITY_CANCELLED: "This group is cancelled. Chat is read-only.",
        ACTIVITY_ENDED: "This group has ended. Chat is read-only.",
        EMPTY_BODY: "Message cannot be empty.",
        BODY_TOO_LONG: "Message is too long.",
        MESSAGE_NOT_FOUND: "This message is no longer available.",
        DELETE_FORBIDDEN: "You cannot delete this message.",
      },
    };
  }

  return {
    deleteFailed: "消息暂时无法删除。",
    invalidRequest: "请求无效。",
    sendFailed: "消息暂时无法发送。",
    errors: {
      ACTIVITY_NOT_FOUND: "这个组局已不可用。",
      PUBLIC_EVENT_UNAVAILABLE: "局内聊天只开放给 Friemi 组局。",
      NOT_ROOM_MEMBER: "加入组局后才能查看局内聊天。",
      ACTIVITY_CANCELLED: "这个组局已取消，聊天仅可查看。",
      ACTIVITY_ENDED: "这个组局已结束，聊天仅可查看。",
      EMPTY_BODY: "消息不能为空。",
      BODY_TOO_LONG: "消息内容过长。",
      MESSAGE_NOT_FOUND: "这条消息已不可用。",
      DELETE_FORBIDDEN: "你不能删除这条消息。",
    },
  };
}
