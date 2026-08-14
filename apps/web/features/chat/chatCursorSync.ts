export type ChatCursorMessage = {
  createdAt: string;
  id: string;
};

export type ChatCursorResponse<TMessage extends ChatCursorMessage> = {
  deletedMessageIds?: string[];
  messages: TMessage[];
  serverTime: string;
};

export const chatCursorWakeEvent = "friemi:chat-cursor-wake";

export function compareChatCursorMessages(
  left: ChatCursorMessage,
  right: ChatCursorMessage,
) {
  const timeDifference =
    new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();

  return timeDifference || left.id.localeCompare(right.id);
}

export function mergeChatCursorMessages<TMessage extends ChatCursorMessage>(
  current: TMessage[],
  incoming: TMessage[],
  deletedMessageIds: string[] = [],
) {
  const deletedIds = new Set(deletedMessageIds);
  const byId = new Map(
    current
      .filter((message) => !deletedIds.has(message.id))
      .map((message) => [message.id, message]),
  );

  for (const message of incoming) {
    if (!deletedIds.has(message.id)) {
      byId.set(message.id, message);
    }
  }

  return [...byId.values()].sort(compareChatCursorMessages);
}

export function getLatestChatCursor(messages: ChatCursorMessage[]) {
  return messages.length > 0
    ? ([...messages].sort(compareChatCursorMessages).at(-1) ?? null)
    : null;
}

export function dispatchChatCursorWake(subjectKey: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(
    new CustomEvent(chatCursorWakeEvent, {
      detail: {
        subjectKey,
      },
    }),
  );
}
