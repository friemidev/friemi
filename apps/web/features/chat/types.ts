export type ChatMentionScopeKind = "activity" | "planet";

export type ChatMentionMember = {
  avatarUrl: string | null;
  id: string;
  nickname: string;
};

export type ChatUnreadMention = {
  createdAt: string;
  kind: "ALL" | "ME";
  messageId: string;
  senderName: string;
};
