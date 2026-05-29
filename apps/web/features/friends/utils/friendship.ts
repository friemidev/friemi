export function getFriendshipPair(userId: string, otherUserId: string) {
  return userId < otherUserId
    ? { userAId: userId, userBId: otherUserId }
    : { userAId: otherUserId, userBId: userId };
}

export function getFriendshipPairKey(userId: string, otherUserId: string) {
  const pair = getFriendshipPair(userId, otherUserId);

  return `${pair.userAId}:${pair.userBId}`;
}
