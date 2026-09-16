"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type UIEventHandler,
} from "react";
import {
  getEarliestChatCursor,
  mergeChatCursorMessages,
  type ChatCursorMessage,
  type ChatCursorResponse,
} from "./chatCursorSync";

type UseChatHistoryPaginationInput<TMessage extends ChatCursorMessage> = {
  endpoint: string;
  initialPageSize: number;
  messages: TMessage[];
  setMessages: (updater: (current: TMessage[]) => TMessage[]) => void;
};

export function useChatHistoryPagination<TMessage extends ChatCursorMessage>({
  endpoint,
  initialPageSize,
  messages,
  setMessages,
}: UseChatHistoryPaginationInput<TMessage>) {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef(messages);
  const requestInFlightRef = useRef(false);
  const [hasMore, setHasMore] = useState(messages.length >= initialPageSize);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    requestInFlightRef.current = false;
    setHasMore(messagesRef.current.length >= initialPageSize);
    setIsLoadingOlder(false);
  }, [endpoint, initialPageSize]);

  const loadOlder = useCallback(async () => {
    if (requestInFlightRef.current || !hasMore) return;

    const cursor = getEarliestChatCursor(messagesRef.current);
    if (!cursor) {
      setHasMore(false);
      return;
    }

    const container = scrollContainerRef.current;
    const previousScrollHeight = container?.scrollHeight ?? 0;
    const previousScrollTop = container?.scrollTop ?? 0;
    const query = new URLSearchParams({
      beforeCreatedAt: cursor.createdAt,
      beforeId: cursor.id,
      limit: String(initialPageSize),
    });

    requestInFlightRef.current = true;
    setIsLoadingOlder(true);

    try {
      const response = await fetch(`${endpoint}?${query.toString()}`, {
        cache: "no-store",
        credentials: "same-origin",
      });

      if (!response.ok) return;

      const payload = (await response.json()) as ChatCursorResponse<TMessage>;
      setHasMore(payload.hasMore ?? payload.messages.length >= initialPageSize);
      setMessages((current) => {
        const merged = mergeChatCursorMessages(current, payload.messages);
        messagesRef.current = merged;
        return merged;
      });

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          const currentContainer = scrollContainerRef.current;
          if (!currentContainer) return;

          currentContainer.scrollTop =
            currentContainer.scrollHeight -
            previousScrollHeight +
            previousScrollTop;
        });
      });
    } catch (error) {
      console.warn("Failed to load older chat messages", error);
    } finally {
      requestInFlightRef.current = false;
      setIsLoadingOlder(false);
    }
  }, [endpoint, hasMore, initialPageSize, setMessages]);

  const onScroll = useCallback<UIEventHandler<HTMLDivElement>>(
    (event) => {
      if (event.currentTarget.scrollTop <= 96) {
        void loadOlder();
      }
    },
    [loadOlder],
  );

  return {
    hasMore,
    isLoadingOlder,
    loadOlder,
    onScroll,
    scrollContainerRef,
  };
}
