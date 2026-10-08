import type { ChatCursorMessage } from "../chatCursorSync";

export function getEnteringChatMessageIds(
  previous: ChatCursorMessage[],
  current: ChatCursorMessage[],
) {
  const previousIds = new Set(previous.map((message) => message.id));
  const currentIds = new Set(current.map((message) => message.id));
  // An optimistic message receiving its server ID is not another new bubble.
  if (
    current.length <= previous.length &&
    previous.some(
      (message) =>
        message.id.startsWith("client-") && !currentIds.has(message.id),
    )
  )
    return [];

  const latestTime = previous.reduce(
    (latest, message) => Math.max(latest, Date.parse(message.createdAt)),
    0,
  );
  return current
    .filter(
      (message) =>
        !previousIds.has(message.id) &&
        Date.parse(message.createdAt) >= latestTime,
    )
    .slice(-12)
    .map((message) => message.id);
}
