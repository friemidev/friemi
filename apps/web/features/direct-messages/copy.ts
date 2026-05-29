import type { DirectMessageErrorCode } from "./services/directMessages";

type DirectMessagesCopy = {
  invalidRequest: string;
  failed: string;
  errors: Record<DirectMessageErrorCode, string>;
};

export function getDirectMessagesCopy(locale: string): DirectMessagesCopy {
  if (locale === "fr") {
    return {
      invalidRequest: "Requête invalide. Actualisez puis réessayez.",
      failed: "Message impossible à envoyer pour le moment.",
      errors: {
        SELF_CONVERSATION:
          "Vous ne pouvez pas créer une conversation avec vous-même.",
        NOT_FRIENDS: "Vous devez être amis pour démarrer cette conversation.",
        CONVERSATION_UNAVAILABLE: "Cette conversation n'est plus disponible.",
        EMPTY_BODY: "Le message ne peut pas être vide.",
        BODY_TOO_LONG: "Le message est trop long.",
      },
    };
  }

  if (locale === "en") {
    return {
      invalidRequest: "Invalid request. Refresh and try again.",
      failed: "Message could not be sent right now.",
      errors: {
        SELF_CONVERSATION: "You cannot start a conversation with yourself.",
        NOT_FRIENDS: "You need to be friends to start this conversation.",
        CONVERSATION_UNAVAILABLE: "This conversation is no longer available.",
        EMPTY_BODY: "Message cannot be empty.",
        BODY_TOO_LONG: "Message is too long.",
      },
    };
  }

  return {
    invalidRequest: "请求无效，请刷新后重试。",
    failed: "消息暂时无法发送，请稍后重试。",
    errors: {
      SELF_CONVERSATION: "不能和自己创建会话。",
      NOT_FRIENDS: "只有好友之间可以创建会话。",
      CONVERSATION_UNAVAILABLE: "这段会话已不可用。",
      EMPTY_BODY: "消息不能为空。",
      BODY_TOO_LONG: "消息内容过长。",
    },
  };
}
