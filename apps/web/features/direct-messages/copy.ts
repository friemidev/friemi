import type { DirectMessageErrorCode } from "./services/directMessages";

type DirectMessagesCopy = {
  title: string;
  description: string;
  listTitle: string;
  listDescription: string;
  threadTitle: (name: string) => string;
  emptyListTitle: string;
  emptyListDescription: string;
  emptyThreadTitle: string;
  emptyThreadDescription: string;
  noSelectedTitle: string;
  noSelectedDescription: string;
  lastMessageEmpty: string;
  messagePlaceholder: string;
  messageHint: string;
  readOnlyTitle: string;
  readOnlyDescription: string;
  send: string;
  sending: string;
  backToMessages: string;
  openFriends: string;
  openConversation: (name: string) => string;
  startConversation: string;
  activitySignal: (date: string, title: string) => string;
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
      listDescription: "Amis avec lesquels vous avez déjà démarré un échange.",
      threadTitle: (name: string) => `Discussion avec ${name}`,
      emptyListTitle: "Aucune discussion",
      emptyListDescription:
        "Démarrez une conversation depuis la page amis. Seuls les amis acceptés peuvent échanger.",
      emptyThreadTitle: "Aucun message",
      emptyThreadDescription:
        "Envoyez un premier message court pour préparer la prochaine sortie.",
      noSelectedTitle: "Choisissez une discussion",
      noSelectedDescription:
        "La liste reste compacte, façon panneau de contacts. Sélectionnez un ami pour lire ou envoyer un message.",
      lastMessageEmpty: "Aucun message pour le moment",
      messagePlaceholder: "Écrire un message...",
      messageHint: "Texte uniquement, 1000 caractères maximum.",
      readOnlyTitle: "Conversation en lecture seule",
      readOnlyDescription:
        "L'historique reste visible, mais vous devez redevenir amis pour envoyer un nouveau message.",
      send: "Envoyer",
      sending: "Envoi...",
      backToMessages: "Messages",
      openFriends: "Voir les amis",
      openConversation: (name: string) => `Ouvrir la discussion avec ${name}`,
      startConversation: "Message",
      activitySignal: (date: string, title: string) =>
        `Participe à « ${title} » le ${date}`,
      openActivity: (title: string) => `Voir l'activité : ${title}`,
      moreActivities: (count: number) => `+${count}`,
      showMoreActivitiesLabel: (count: number) =>
        `Afficher ${count} activité(s) récente(s) de plus`,
      collapseActivities: "Réduire",
      youPrefix: "Vous :",
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
      title: "Messages",
      description:
        "Keep lightweight one-to-one conversations with friends before an activity.",
      listTitle: "Chats",
      listDescription: "Friends you have started a conversation with.",
      threadTitle: (name: string) => `Chat with ${name}`,
      emptyListTitle: "No chats yet",
      emptyListDescription:
        "Start one from the friends page. Only accepted friends can message each other.",
      emptyThreadTitle: "No messages yet",
      emptyThreadDescription:
        "Send a short first message to plan the next activity.",
      noSelectedTitle: "Pick a chat",
      noSelectedDescription:
        "The list stays compact like a contacts panel. Select a friend to read or send messages.",
      lastMessageEmpty: "No messages yet",
      messagePlaceholder: "Write a message...",
      messageHint: "Text only, up to 1000 characters.",
      readOnlyTitle: "Read-only chat",
      readOnlyDescription:
        "The history stays visible, but you need to be friends again before sending a new message.",
      send: "Send",
      sending: "Sending...",
      backToMessages: "Messages",
      openFriends: "Open friends",
      openConversation: (name: string) => `Open chat with ${name}`,
      startConversation: "Message",
      activitySignal: (date: string, title: string) =>
        `Joined "${title}" on ${date}`,
      openActivity: (title: string) => `Open activity: ${title}`,
      moreActivities: (count: number) => `+${count}`,
      showMoreActivitiesLabel: (count: number) =>
        `Show ${count} more recent activities`,
      collapseActivities: "Collapse",
      youPrefix: "You:",
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
    title: "消息",
    description: "和好友进行轻量点对点沟通，适合活动前简单确认。",
    listTitle: "聊天列表",
    listDescription: "已和你建立会话的好友。",
    threadTitle: (name: string) => `和 ${name} 的聊天`,
    emptyListTitle: "还没有聊天",
    emptyListDescription:
      "可以从好友页发起会话。第一版只允许已接受好友互相发送消息。",
    emptyThreadTitle: "还没有消息",
    emptyThreadDescription: "发送第一条简短消息，约定活动前的信息。",
    noSelectedTitle: "选择一个聊天",
    noSelectedDescription:
      "聊天列表保持联系人面板式的紧凑布局，选择好友后即可查看或发送消息。",
    lastMessageEmpty: "还没有消息",
    messagePlaceholder: "输入消息...",
    messageHint: "仅支持纯文本，最多 1000 字。",
    readOnlyTitle: "当前聊天只读",
    readOnlyDescription: "历史消息仍可查看，但需要重新成为好友后才能继续发送。",
    send: "发送",
    sending: "发送中...",
    backToMessages: "消息",
    openFriends: "查看好友",
    openConversation: (name: string) => `打开和 ${name} 的聊天`,
    startConversation: "发消息",
    activitySignal: (date: string, title: string) =>
      `${date} 参加了「${title}」`,
    openActivity: (title: string) => `查看活动：${title}`,
    moreActivities: (count: number) => `+${count}`,
    showMoreActivitiesLabel: (count: number) => `展开 ${count} 个近期活动`,
    collapseActivities: "收起",
    youPrefix: "你：",
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
