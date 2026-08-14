import type { ActivityRoomChatErrorCode } from "./services/activityRoomChat";

type ActivityRoomChatCopy = {
  announcements: {
    acknowledge: string;
    close: string;
    delete: string;
    deleteFailed: string;
    deleting: string;
    latest: string;
    open: string;
    title: string;
  };
  backToActivity: string;
  createGroup: string;
  deletedMessage: string;
  deleteFailed: string;
  deleteMessage: string;
  cancelSelection: string;
  emptyDescription: string;
  emptyTitle: string;
  errors: Record<ActivityRoomChatErrorCode, string>;
  invalidRequest: string;
  addEmoji: string;
  attachImage: string;
  imageMessage: string;
  imageUploadFailed: string;
  imageUploading: string;
  removeImage: string;
  resetImagePreview: string;
  saveImage: string;
  savingImage: string;
  tooManyImages: string;
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
  selectMessage: string;
  selectedMessages: (count: number) => string;
  sending: string;
  title: string;
  viewActivity: string;
};

export function getActivityRoomChatCopy(locale: string): ActivityRoomChatCopy {
  if (locale === "fr") {
    return {
      announcements: {
        acknowledge: "Compris",
        close: "Fermer",
        delete: "Supprimer",
        deleteFailed: "Impossible de supprimer cette annonce.",
        deleting: "Suppression...",
        latest: "Nouveau",
        open: "Voir les annonces",
        title: "Annonce du groupe",
      },
      backToActivity: "Retour aux discussions",
      createGroup: "Créer un groupe",
      deletedMessage: "Message supprimé",
      deleteFailed: "Message impossible à supprimer pour le moment.",
      deleteMessage: "Supprimer",
      cancelSelection: "Annuler la sélection",
      emptyDescription: "Dites bonjour quand vous êtes prêt.",
      emptyTitle: "Aucun message",
      invalidRequest: "Réessayez avec un message valide.",
      addEmoji: "Ajouter emoji",
      attachImage: "Ajouter une image",
      imageMessage: "Image",
      imageUploadFailed: "Image impossible à importer.",
      imageUploading: "Import...",
      removeImage: "Retirer l'image",
      resetImagePreview: "Réinitialiser",
      saveImage: "Enregistrer l'image",
      savingImage: "Enregistrement...",
      tooManyImages: "Vous pouvez envoyer jusqu'à 4 images.",
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
      selectMessage: "Sélectionner",
      selectedMessages: (count) =>
        `${count} sélectionné${count > 1 ? "s" : ""}`,
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
        TOO_MANY_IMAGES: "Vous pouvez envoyer jusqu'à 4 images.",
        INVALID_IMAGE_URL: "Une image n'est pas valide.",
        INVALID_MENTION: "Cette personne n'est plus dans le groupe.",
        MENTION_ALL_FORBIDDEN:
          "Seuls les administrateurs peuvent mentionner tout le monde.",
        MESSAGE_NOT_FOUND: "Ce message n'est plus disponible.",
        DELETE_FORBIDDEN: "Vous ne pouvez pas supprimer ce message.",
      },
    };
  }

  if (locale === "en") {
    return {
      announcements: {
        acknowledge: "Got it",
        close: "Close",
        delete: "Delete",
        deleteFailed: "Could not delete this announcement.",
        deleting: "Deleting...",
        latest: "New",
        open: "View announcements",
        title: "Group announcement",
      },
      backToActivity: "Back to chats",
      createGroup: "Create group",
      deletedMessage: "Message deleted",
      deleteFailed: "Could not delete the message.",
      deleteMessage: "Delete",
      cancelSelection: "Cancel selection",
      emptyDescription: "Say hello when you are ready.",
      emptyTitle: "No messages yet",
      invalidRequest: "Try again with a valid message.",
      addEmoji: "Add emoji",
      attachImage: "Add image",
      imageMessage: "Image",
      imageUploadFailed: "Image could not be uploaded.",
      imageUploading: "Uploading...",
      removeImage: "Remove image",
      resetImagePreview: "Reset",
      saveImage: "Save image",
      savingImage: "Saving image...",
      tooManyImages: "You can send up to 4 images.",
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
      selectMessage: "Select",
      selectedMessages: (count) => `${count} selected`,
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
        TOO_MANY_IMAGES: "You can send up to 4 images.",
        INVALID_IMAGE_URL: "One image is invalid.",
        INVALID_MENTION: "That person is no longer in this group.",
        MENTION_ALL_FORBIDDEN: "Only group admins can mention everyone.",
        MESSAGE_NOT_FOUND: "This message is no longer available.",
        DELETE_FORBIDDEN: "You cannot delete this message.",
      },
    };
  }

  return {
    announcements: {
      acknowledge: "知道了",
      close: "关闭",
      delete: "删除",
      deleteFailed: "这条公告暂时无法删除。",
      deleting: "删除中...",
      latest: "最新",
      open: "查看群公告",
      title: "群公告",
    },
    backToActivity: "返回聊聊",
    createGroup: "创建聚吧",
    deletedMessage: "消息已删除",
    deleteFailed: "消息暂时无法删除。",
    deleteMessage: "删除",
    cancelSelection: "取消多选",
    emptyDescription: "可以先和大家打个招呼。",
    emptyTitle: "还没有消息",
    invalidRequest: "请重新输入一条消息。",
    addEmoji: "添加表情",
    attachImage: "添加图片",
    imageMessage: "图片",
    imageUploadFailed: "图片上传失败，请稍后再试。",
    imageUploading: "上传中...",
    removeImage: "移除图片",
    resetImagePreview: "重置",
    saveImage: "保存到相册",
    savingImage: "正在保存...",
    tooManyImages: "一次最多发送 4 张图片。",
    lockedTitle: "暂时不能查看",
    loginAction: "登录",
    loginDescription: "登录后可以查看局内聊天。",
    loginTitle: "请先登录",
    openActivity: "查看聚吧",
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
    selectMessage: "多选",
    selectedMessages: (count) => `已选择 ${count} 条`,
    sending: "发送中...",
    title: "局内群聊",
    viewActivity: "查看聚吧",
    errors: {
      ACTIVITY_NOT_FOUND: "这个聚吧已不可用。",
      PUBLIC_EVENT_UNAVAILABLE: "创建 Friemi 聚吧后就能一起聊。",
      NOT_ROOM_MEMBER: "加入聚吧后才能查看局内聊天。",
      PENDING_APPROVAL: "你的报名还在等待确认。",
      PARTICIPATION_UNAVAILABLE: "你暂时不能查看这个聊天。",
      ACTIVITY_CANCELLED: "这个聚吧已取消，消息仅可查看。",
      ACTIVITY_ENDED: "这个聚吧已结束，消息仅可查看。",
      EMPTY_BODY: "消息不能为空。",
      BODY_TOO_LONG: "消息内容过长。",
      TOO_MANY_IMAGES: "一次最多发送 4 张图片。",
      INVALID_IMAGE_URL: "其中一张图片无效。",
      INVALID_MENTION: "这位用户已不在群聊中。",
      MENTION_ALL_FORBIDDEN: "只有创建者和管理员可以@所有人。",
      MESSAGE_NOT_FOUND: "这条消息已不可用。",
      DELETE_FORBIDDEN: "你不能删除这条消息。",
    },
  };
}
