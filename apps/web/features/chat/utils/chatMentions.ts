import type { ChatMentionMember } from "../types";

export const chatMentionMaxProfileCount = 100;

export function normalizeChatMentionProfileIds(
  profileIds: string[],
  maxCount = chatMentionMaxProfileCount,
) {
  return [...new Set(profileIds.map((profileId) => profileId.trim()))]
    .filter(Boolean)
    .slice(0, maxCount);
}

export function getChatMentionEveryoneToken(locale: string) {
  if (locale === "fr") {
    return "@tout le monde";
  }

  if (locale === "en") {
    return "@everyone";
  }

  return "@所有人";
}

export function getChatMentionMemberToken(member: ChatMentionMember) {
  return `@${member.nickname.trim() || "Friemi"}`;
}

export function hasChatMentionToken(content: string, token: string) {
  return content.includes(token);
}
