import type { ChatReplyTarget } from "./types";

export const chatReplyRequestEvent = "friemi:chat-reply-request";

export type ChatReplyRequestDetail = {
  replyTo: ChatReplyTarget;
  scopeId: string;
};

export function dispatchChatReplyRequest(detail: ChatReplyRequestDetail) {
  window.dispatchEvent(
    new CustomEvent<ChatReplyRequestDetail>(chatReplyRequestEvent, { detail }),
  );
}
