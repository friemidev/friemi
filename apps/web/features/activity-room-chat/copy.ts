import type { ActivityRoomChatErrorCode } from "./services/activityRoomChat";

type ActivityRoomChatCopy = {
  backToActivity: string;
  createGroup: string;
  deletedMessage: string;
  deleteFailed: string;
  deleteMessage: string;
  emptyDescription: string;
  emptyTitle: string;
  errors: Record<ActivityRoomChatErrorCode, string>;
  invalidRequest: string;
  lockedTitle: string;
  loginAction: string;
  loginDescription: string;
  loginTitle: string;
  openActivity: string;
  placeholder: string;
  readOnly: string;
  roleLabels: {
    CO_MANAGER: string;
    NONE: string;
    ORGANIZER: string;
    PARTICIPANT: string;
  };
  send: string;
  sendFailed: string;
  sending: string;
  title: string;
  viewActivity: string;
};

export function getActivityRoomChatCopy(locale: string): ActivityRoomChatCopy {
  if (locale === "fr") {
    return {
      backToActivity: "Retour",
      createGroup: "Créer un groupe",
      deletedMessage: "Message supprimé",
      deleteFailed: "Message impossible à supprimer pour le moment.",
      deleteMessage: "Supprimer",
      emptyDescription: "Dites bonjour quand vous êtes prêt.",
      emptyTitle: "Aucun message",
      invalidRequest: "Réessayez avec un message valide.",
      lockedTitle: "Pas encore disponible",
      loginAction: "Se connecter",
      loginDescription: "Connectez-vous pour voir la discussion.",
      loginTitle: "Connectez-vous d'abord",
      openActivity: "Voir le groupe",
      placeholder: "Écrire un message...",
      readOnly: "À consulter",
      roleLabels: {
        CO_MANAGER: "Co-hôte",
        NONE: "Invité",
        ORGANIZER: "Organisateur",
        PARTICIPANT: "Membre",
      },
      send: "Envoyer",
      sendFailed: "Message non envoyé.",
      sending: "Envoi...",
      title: "Discussion",
      viewActivity: "Voir le groupe",
      errors: {
        ACTIVITY_NOT_FOUND: "Cette sortie n'est plus disponible.",
        PUBLIC_EVENT_UNAVAILABLE:
          "Créez un groupe Friemi pour discuter ensemble.",
        NOT_ROOM_MEMBER: "Rejoignez le groupe pour voir la discussion.",
        PENDING_APPROVAL: "Votre demande est en attente.",
        PARTICIPATION_UNAVAILABLE: "Vous n'avez plus accès à cette discussion.",
        ACTIVITY_CANCELLED:
          "Ce groupe est annulé. Vous pouvez relire les messages.",
        ACTIVITY_ENDED:
          "Ce groupe est terminé. Vous pouvez relire les messages.",
        EMPTY_BODY: "Le message ne peut pas être vide.",
        BODY_TOO_LONG: "Le message est trop long.",
        MESSAGE_NOT_FOUND: "Ce message n'est plus disponible.",
        DELETE_FORBIDDEN: "Vous ne pouvez pas supprimer ce message.",
      },
    };
  }

  if (locale === "en") {
    return {
      backToActivity: "Back",
      createGroup: "Create group",
      deletedMessage: "Message deleted",
      deleteFailed: "Could not delete the message.",
      deleteMessage: "Delete",
      emptyDescription: "Say hello when you are ready.",
      emptyTitle: "No messages yet",
      invalidRequest: "Try again with a valid message.",
      lockedTitle: "Not available yet",
      loginAction: "Sign in",
      loginDescription: "Sign in to see the room chat.",
      loginTitle: "Sign in first",
      openActivity: "View group",
      placeholder: "Write a message...",
      readOnly: "View only",
      roleLabels: {
        CO_MANAGER: "Co-host",
        NONE: "Guest",
        ORGANIZER: "Host",
        PARTICIPANT: "Member",
      },
      send: "Send",
      sendFailed: "Message not sent.",
      sending: "Sending...",
      title: "Room chat",
      viewActivity: "View group",
      errors: {
        ACTIVITY_NOT_FOUND: "This activity is no longer available.",
        PUBLIC_EVENT_UNAVAILABLE: "Create a Friemi group to chat together.",
        NOT_ROOM_MEMBER: "Join the group to see the chat.",
        PENDING_APPROVAL: "Your request is still pending.",
        PARTICIPATION_UNAVAILABLE: "You no longer have access to this chat.",
        ACTIVITY_CANCELLED: "This group was cancelled. Messages are read-only.",
        ACTIVITY_ENDED: "This group has ended. Messages are read-only.",
        EMPTY_BODY: "Message cannot be empty.",
        BODY_TOO_LONG: "Message is too long.",
        MESSAGE_NOT_FOUND: "This message is no longer available.",
        DELETE_FORBIDDEN: "You cannot delete this message.",
      },
    };
  }

  return {
    backToActivity: "返回",
    createGroup: "创建组局",
    deletedMessage: "消息已删除",
    deleteFailed: "消息暂时无法删除。",
    deleteMessage: "删除",
    emptyDescription: "可以先和大家打个招呼。",
    emptyTitle: "还没有消息",
    invalidRequest: "请重新输入一条消息。",
    lockedTitle: "暂时不能查看",
    loginAction: "登录",
    loginDescription: "登录后可以查看局内聊天。",
    loginTitle: "请先登录",
    openActivity: "查看组局",
    placeholder: "输入消息...",
    readOnly: "只能查看",
    roleLabels: {
      CO_MANAGER: "协管",
      NONE: "访客",
      ORGANIZER: "发起人",
      PARTICIPANT: "成员",
    },
    send: "发送",
    sendFailed: "消息没有发出去。",
    sending: "发送中...",
    title: "局内群聊",
    viewActivity: "查看组局",
    errors: {
      ACTIVITY_NOT_FOUND: "这个组局已不可用。",
      PUBLIC_EVENT_UNAVAILABLE: "创建 Friemi 组局后就能一起聊。",
      NOT_ROOM_MEMBER: "加入组局后才能查看局内聊天。",
      PENDING_APPROVAL: "你的报名还在等待确认。",
      PARTICIPATION_UNAVAILABLE: "你暂时不能查看这个聊天。",
      ACTIVITY_CANCELLED: "这个组局已取消，消息仅可查看。",
      ACTIVITY_ENDED: "这个组局已结束，消息仅可查看。",
      EMPTY_BODY: "消息不能为空。",
      BODY_TOO_LONG: "消息内容过长。",
      MESSAGE_NOT_FOUND: "这条消息已不可用。",
      DELETE_FORBIDDEN: "你不能删除这条消息。",
    },
  };
}
