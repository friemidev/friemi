export function getConversationPair(userId: string, otherUserId: string) {
  return userId < otherUserId
    ? { userAId: userId, userBId: otherUserId }
    : { userAId: otherUserId, userBId: userId };
}

export function getConversationPeerId(
  conversation: { userAId: string; userBId: string },
  currentUserProfileId: string,
) {
  return conversation.userAId === currentUserProfileId
    ? conversation.userBId
    : conversation.userAId;
}
