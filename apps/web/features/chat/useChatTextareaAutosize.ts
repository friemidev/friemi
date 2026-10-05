"use client";

import { useLayoutEffect, type RefObject } from "react";
import { getChatTextareaSize } from "./utils/chatTextareaSize";

function resizeChatTextarea(textarea: HTMLTextAreaElement) {
  const style = window.getComputedStyle(textarea);
  const history = textarea
    .closest(".mobile-chat-viewport")
    ?.querySelector<HTMLElement>(".chat-message-scroll");
  const wasAtBottom = history
    ? history.scrollHeight - history.scrollTop - history.clientHeight < 48
    : false;
  const previousHeight = textarea.offsetHeight;
  const previousScroll = textarea.scrollTop;

  textarea.style.height = "auto";
  textarea.style.overflowY = "hidden";
  const { height, overflow } = getChatTextareaSize({
    scrollHeight: textarea.scrollHeight,
    lineHeight: Number.parseFloat(style.lineHeight),
    padding:
      Number.parseFloat(style.paddingTop) +
      Number.parseFloat(style.paddingBottom),
    border:
      Number.parseFloat(style.borderTopWidth) +
      Number.parseFloat(style.borderBottomWidth),
  });
  textarea.style.height = `${height}px`;
  textarea.style.overflowY = overflow ? "auto" : "hidden";
  textarea.scrollTop =
    overflow && textarea.selectionEnd === textarea.value.length
      ? textarea.scrollHeight
      : previousScroll;

  if (history && wasAtBottom && previousHeight !== height) {
    history.scrollTop = history.scrollHeight;
  }
}

export function useChatTextareaAutosize(
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string | number,
) {
  useLayoutEffect(() => {
    if (ref.current) resizeChatTextarea(ref.current);
  }, [ref, value]);

  useLayoutEffect(() => {
    const textarea = ref.current;
    if (!textarea) return;

    const resize = () => resizeChatTextarea(textarea);
    let previousWidth = textarea.clientWidth;
    // Rewrap on rotation/container changes, without reacting to our own height changes.
    const observer = new ResizeObserver(() => {
      if (textarea.clientWidth !== previousWidth) {
        previousWidth = textarea.clientWidth;
        resize();
      }
    });
    observer.observe(textarea);
    textarea.addEventListener("input", resize);
    window.addEventListener("resize", resize);

    return () => {
      observer.disconnect();
      textarea.removeEventListener("input", resize);
      window.removeEventListener("resize", resize);
    };
  }, [ref]);
}
