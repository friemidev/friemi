import type { DirectMessageErrorCode } from "./services/directMessages";
import type { FriendNearestActivityTimeState } from "@/features/friends/queries/getFriendNearestActivitySignals";

type DirectMessagesCopy = {
  title: string;
  description: string;
  listTitle: string;
  listDescription: string;
  friendListTitle: string;
  friendListDescription: string;
  threadTitle: (name: string) => string;
  emptyListTitle: string;
  emptyListDescription: string;
  emptyFriendListTitle: string;
  emptyFriendListDescription: string;
  emptyThreadTitle: string;
  emptyThreadDescription: string;
  noSelectedTitle: string;
  noSelectedDescription: string;
  lastMessageEmpty: string;
  messagePlaceholder: string;
  readOnlyTitle: string;
  readOnlyDescription: string;
  send: string;
  sending: string;
  sendingStatus: string;
  sendFailedStatus: string;
  retrySend: string;
  addEmoji: string;
  attachImage: string;
  imageMessage: string;
  resetImagePreview: string;
  imageUploadFailed: string;
  imageUploading: string;
  removeImage: string;
  backToMessages: string;
  viewProfile: string;
  openFriends: string;
  openConversation: (name: string) => string;
  searchPlaceholder: string;
  startConversation: string;
  activityContextLabel: string;
  activityContextCta: string;
  activityMessageSuggestion: (title: string) => string;
  sourceActivityLabel: (title: string) => string;
  addFriend: string;
  startChat: string;
  activitySignal: (
    date: string,
    title: string,
    state: FriendNearestActivityTimeState,
  ) => string;
  openActivity: (title: string) => string;
  moreActivities: (count: number) => string;
  showMoreActivitiesLabel: (count: number) => string;
  collapseActivities: string;
  youPrefix: string;
  invalidRequest: string;
  failed: string;
  errors: Record<DirectMessageErrorCode, string>;
};

export function getDirectMessagesCopy(locale: string): DirectMessagesCopy {
  if (locale === "fr") {
    return {
      title: "Messages",
      description:
        "Échangez simplement avec vos amis autour des sorties à venir.",
      listTitle: "Discussions",
      listDescription: "Vos conversations récentes.",
      friendListTitle: "Amis",
      friendListDescription: "Touchez un ami pour discuter",
      threadTitle: (name: string) => `Discussion avec ${name}`,
      emptyListTitle: "Aucune discussion",
      emptyListDescription: "Ajoutez un ami pour commencer à discuter.",
      emptyFriendListTitle: "Aucun ami pour le moment",
      emptyFriendListDescription: "Ajoutez un ami pour commencer.",
      emptyThreadTitle: "Aucun message",
      emptyThreadDescription:
        "Envoyez un premier message court pour préparer la prochaine sortie.",
      noSelectedTitle: "Choisissez une discussion",
      noSelectedDescription:
        "Sélectionnez un ami pour lire ou envoyer un message.",
      lastMessageEmpty: "Aucun message pour le moment",
      messagePlaceholder: "Écrire un message...",
      readOnlyTitle: "Conversation en lecture seule",
      readOnlyDescription:
        "L'historique reste visible, mais vous devez redevenir amis pour envoyer un nouveau message.",
      send: "Envoyer",
      sending: "Envoi...",
      sendingStatus: "Envoi...",
      sendFailedStatus: "Échec de l'envoi",
      retrySend: "Réessayer",
      addEmoji: "Ajouter emoji",
      attachImage: "Ajouter une image",
      imageMessage: "Image",
      resetImagePreview: "Réinitialiser",
      imageUploadFailed: "Image impossible à importer.",
      imageUploading: "Import...",
      removeImage: "Retirer l'image",
      backToMessages: "Messages",
      viewProfile: "Voir le profil",
      openFriends: "Voir les amis",
      openConversation: (name: string) => `Ouvrir la discussion avec ${name}`,
      searchPlaceholder: "Rechercher une discussion",
      startConversation: "Message",
      activityContextLabel: "À propos de cette sortie",
      activityContextCta: "Voir la sortie",
      activityMessageSuggestion: (title: string) =>
        `Bonjour, j'ai une question sur « ${title} ».`,
      sourceActivityLabel: (title: string) => `Depuis « ${title} »`,
      addFriend: "Ajouter",
      startChat: "Démarrer la discussion",
      activitySignal: (date: string, title: string, state) =>
        state === "ONGOING"
          ? `En cours : « ${title} »`
          : state === "ENDED"
            ? `A rejoint « ${title} » le ${date}`
            : `Prévoit « ${title} » le ${date}`,
      openActivity: (title: string) => `Voir l'activité : ${title}`,
      moreActivities: (count: number) => `+${count}`,
      showMoreActivitiesLabel: (count: number) =>
        `Afficher ${count} activité(s) récente(s) de plus`,
      collapseActivities: "Réduire",
      youPrefix: "Vous :",
      invalidRequest: "Requête invalide. Réessayez plus tard.",
      failed: "Message impossible à envoyer pour le moment.",
      errors: {
        AUTH_REQUIRED: "Connectez-vous pour envoyer un message.",
        SELF_CONVERSATION:
          "Vous ne pouvez pas créer une conversation avec vous-même.",
        LOW_TRUST:
          "Votre compte doit retrouver un niveau de confiance suffisant avant d'envoyer ce message.",
        NOT_FRIENDS: "Vous devez être amis pour démarrer cette conversation.",
        NON_FRIEND_LIMIT_REACHED:
          "Attendez une réponse avant d'envoyer un autre message.",
        CONVERSATION_UNAVAILABLE: "Cette conversation n'est plus disponible.",
        EMPTY_BODY: "Le message ne peut pas être vide.",
        BODY_TOO_LONG: "Le message est trop long.",
        TOO_MANY_IMAGES: "Vous pouvez envoyer jusqu'à 4 images à la fois.",
        INVALID_IMAGE_URL: "Une image n'est pas valide.",
      },
    };
  }

  if (locale === "en") {
    return {
      title: "Messages",
      description: "Chat with friends before an activity.",
      listTitle: "Chats",
      listDescription: "Your recent conversations.",
      friendListTitle: "Friends",
      friendListDescription: "Tap a friend to chat",
      threadTitle: (name: string) => `Chat with ${name}`,
      emptyListTitle: "No chats yet",
      emptyListDescription: "Add a friend to start chatting.",
      emptyFriendListTitle: "No friends yet",
      emptyFriendListDescription: "Add a friend to start chatting.",
      emptyThreadTitle: "No messages yet",
      emptyThreadDescription:
        "Send a short first message to plan the next activity.",
      noSelectedTitle: "Pick a chat",
      noSelectedDescription: "Select a friend to read or send messages.",
      lastMessageEmpty: "No messages yet",
      messagePlaceholder: "Write a message...",
      readOnlyTitle: "Read-only chat",
      readOnlyDescription:
        "The history stays visible, but you need to be friends again before sending a new message.",
      send: "Send",
      sending: "Sending...",
      sendingStatus: "Sending...",
      sendFailedStatus: "Send failed",
      retrySend: "Retry",
      addEmoji: "Add emoji",
      attachImage: "Add image",
      imageMessage: "Image",
      resetImagePreview: "Reset",
      imageUploadFailed: "Image could not be uploaded.",
      imageUploading: "Uploading...",
      removeImage: "Remove image",
      backToMessages: "Messages",
      viewProfile: "View profile",
      openFriends: "Open friends",
      openConversation: (name: string) => `Open chat with ${name}`,
      searchPlaceholder: "Search chats",
      startConversation: "Message",
      activityContextLabel: "About this activity",
      activityContextCta: "View activity",
      activityMessageSuggestion: (title: string) =>
        `Hi, I have a question about "${title}".`,
      sourceActivityLabel: (title: string) => `From "${title}"`,
      addFriend: "Add",
      startChat: "Start chat",
      activitySignal: (date: string, title: string, state) =>
        state === "ONGOING"
          ? `At "${title}" now`
          : state === "ENDED"
            ? `Recently joined "${title}" on ${date}`
            : `Plans to join "${title}" on ${date}`,
      openActivity: (title: string) => `Open activity: ${title}`,
      moreActivities: (count: number) => `+${count}`,
      showMoreActivitiesLabel: (count: number) =>
        `Show ${count} more recent activities`,
      collapseActivities: "Collapse",
      youPrefix: "You:",
      invalidRequest: "Invalid request. Try again later.",
      failed: "Message could not be sent right now.",
      errors: {
        AUTH_REQUIRED: "Sign in to send a message.",
        SELF_CONVERSATION: "You cannot start a conversation with yourself.",
        LOW_TRUST:
          "Your account needs a higher trust level before sending this message.",
        NOT_FRIENDS: "You need to be friends to start this conversation.",
        NON_FRIEND_LIMIT_REACHED:
          "Wait for a reply before sending another message.",
        CONVERSATION_UNAVAILABLE: "This conversation is no longer available.",
        EMPTY_BODY: "Message cannot be empty.",
        BODY_TOO_LONG: "Message is too long.",
        TOO_MANY_IMAGES: "You can send up to 4 images at a time.",
        INVALID_IMAGE_URL: "One image is invalid.",
      },
    };
  }

  return {
    title: "消息",
    description: "和好友聊聊，活动前快速确认。",
    listTitle: "聊天列表",
    listDescription: "最近联系的好友。",
    friendListTitle: "好友列表",
    friendListDescription: "点一位好友，开始聊天",
    threadTitle: (name: string) => `和 ${name} 的聊天`,
    emptyListTitle: "还没有聊天",
    emptyListDescription: "添加好友后，就可以在这里聊天。",
    emptyFriendListTitle: "暂无好友",
    emptyFriendListDescription: "添加好友后即可开始聊天。",
    emptyThreadTitle: "还没有消息",
    emptyThreadDescription: "发送第一条简短消息，约定活动前的信息。",
    noSelectedTitle: "选择一个聊天",
    noSelectedDescription: "选择一位好友，查看或发送消息。",
    lastMessageEmpty: "还没有消息",
    messagePlaceholder: "输入消息...",
    readOnlyTitle: "当前聊天只读",
    readOnlyDescription: "历史消息仍可查看，但需要重新成为好友后才能继续发送。",
    send: "发送",
    sending: "发送中...",
    sendingStatus: "发送中...",
    sendFailedStatus: "发送失败",
    retrySend: "重试",
    addEmoji: "添加表情",
    attachImage: "添加图片",
    imageMessage: "图片",
    resetImagePreview: "重置",
    imageUploadFailed: "图片上传失败，请稍后再试。",
    imageUploading: "上传中...",
    removeImage: "移除图片",
    backToMessages: "消息",
    viewProfile: "查看主页",
    openFriends: "查看好友",
    openConversation: (name: string) => `打开和 ${name} 的聊天`,
    searchPlaceholder: "搜索聊天",
    startConversation: "发消息",
    activityContextLabel: "关于这个组局",
    activityContextCta: "查看组局",
    activityMessageSuggestion: (title: string) =>
      `你好，我想了解一下「${title}」的具体安排。`,
    sourceActivityLabel: (title: string) => `来自「${title}」`,
    addFriend: "添加",
    startChat: "开始聊天",
    activitySignal: (date: string, title: string, state) =>
      state === "ONGOING"
        ? `正在参加「${title}」`
        : state === "ENDED"
          ? `${date} 参加过「${title}」`
          : `${date} 想去「${title}」`,
    openActivity: (title: string) => `查看活动：${title}`,
    moreActivities: (count: number) => `+${count}`,
    showMoreActivitiesLabel: (count: number) => `展开 ${count} 个近期活动`,
    collapseActivities: "收起",
    youPrefix: "你：",
    invalidRequest: "请求无效，请稍后再试。",
    failed: "消息暂时无法发送，请稍后重试。",
    errors: {
      AUTH_REQUIRED: "登录后才能发送消息。",
      SELF_CONVERSATION: "不能和自己创建会话。",
      LOW_TRUST: "当前信用状态暂时不能发送这条消息。",
      NOT_FRIENDS: "只有好友之间可以创建会话。",
      NON_FRIEND_LIMIT_REACHED: "请等待对方回复后再继续发送。",
      CONVERSATION_UNAVAILABLE: "这段会话已不可用。",
      EMPTY_BODY: "消息不能为空。",
      BODY_TOO_LONG: "消息内容过长。",
      TOO_MANY_IMAGES: "一次最多发送 4 张图片。",
      INVALID_IMAGE_URL: "图片地址无效。",
    },
  };
}
