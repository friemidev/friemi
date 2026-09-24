"use client";

import { Smile } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export const chatEmojiOptions = [
  "😂",
  "😊",
  "😍",
  "🥳",
  "😭",
  "👍",
  "🙌",
  "👌",
  "🙏",
  "😎",
  "😴",
  "😋",
  "😅",
  "😮",
  "🤔",
  "😇",
  "🥰",
  "😆",
  "🎉",
  "🌹",
  "❤️",
  "🔥",
  "✨",
  "🍻",
  "☕",
  "🎬",
  "🎲",
  "🏀",
  "🚇",
  "📍",
  "✅",
  "🕒",
] as const;

export function ChatEmojiPicker({
  align = "left",
  disabled = false,
  label,
  onSelect,
}: {
  align?: "left" | "right";
  disabled?: boolean;
  label: string;
  onSelect: (emoji: string) => void;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState<{
    left: number;
    maxHeight: number;
    top: number;
    width: number;
  } | null>(null);

  useEffect(() => {
    if (!open) return;

    function closeOnOutsidePointer(event: PointerEvent) {
      const target = event.target as Node;

      if (
        !rootRef.current?.contains(target) &&
        !panelRef.current?.contains(target)
      ) {
        setOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", closeOnOutsidePointer);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  useEffect(() => {
    if (disabled) {
      setOpen(false);
    }
  }, [disabled]);

  useLayoutEffect(() => {
    if (!open) {
      setPanelPosition(null);
      return;
    }

    function updatePanelPosition() {
      const trigger = rootRef.current;

      if (!trigger) {
        return;
      }

      const rect = trigger.getBoundingClientRect();
      const visualViewport = window.visualViewport;
      const viewportLeft = visualViewport?.offsetLeft ?? 0;
      const viewportTop = visualViewport?.offsetTop ?? 0;
      const viewportWidth = visualViewport?.width ?? window.innerWidth;
      const viewportHeight = visualViewport?.height ?? window.innerHeight;
      const edgeGap = 8;
      const width = Math.max(0, Math.min(320, viewportWidth - edgeGap * 2));
      const maxHeight = Math.max(120, viewportHeight - edgeGap * 2);
      const panelHeight = Math.min(
        panelRef.current?.offsetHeight ?? 196,
        maxHeight,
      );
      const preferredLeft = align === "right" ? rect.right - width : rect.left;
      const minLeft = viewportLeft + edgeGap;
      const maxLeft = Math.max(
        minLeft,
        viewportLeft + viewportWidth - width - edgeGap,
      );
      const minTop = viewportTop + edgeGap;
      const maxTop = Math.max(
        minTop,
        viewportTop + viewportHeight - panelHeight - edgeGap,
      );
      const nextPosition = {
        left: Math.min(Math.max(preferredLeft, minLeft), maxLeft),
        maxHeight,
        top: Math.min(Math.max(rect.top - panelHeight - edgeGap, minTop), maxTop),
        width,
      };

      setPanelPosition((current) =>
        current &&
        current.left === nextPosition.left &&
        current.maxHeight === nextPosition.maxHeight &&
        current.top === nextPosition.top &&
        current.width === nextPosition.width
          ? current
          : nextPosition,
      );
    }

    updatePanelPosition();
    const frame = window.requestAnimationFrame(updatePanelPosition);
    const visualViewport = window.visualViewport;
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);
    visualViewport?.addEventListener("resize", updatePanelPosition);
    visualViewport?.addEventListener("scroll", updatePanelPosition);

    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
      visualViewport?.removeEventListener("resize", updatePanelPosition);
      visualViewport?.removeEventListener("scroll", updatePanelPosition);
    };
  }, [align, open]);

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={label}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#F3F6F2] text-[#156240] ring-1 ring-[#E1E3DA] transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156240]/30 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        title={label}
        type="button"
      >
        <Smile className="h-5 w-5" />
      </button>
      {open && !disabled && panelPosition
        ? createPortal(
            <div
              aria-label={label}
              className="fixed z-[160] overflow-y-auto overscroll-contain rounded-lg border border-[#E1E3DA] bg-white p-2.5 shadow-[0_18px_38px_rgba(21,98,64,0.16)]"
              data-chat-emoji-panel
              ref={panelRef}
              role="dialog"
              style={panelPosition}
            >
              <div className="grid grid-cols-8 gap-1">
                {chatEmojiOptions.map((emoji) => (
                  <button
                    aria-label={`${label} ${emoji}`}
                    className="inline-flex h-9 min-w-0 items-center justify-center rounded-full text-xl transition hover:bg-[#F1F6F2] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156240]/30"
                    key={emoji}
                    onClick={() => onSelect(emoji)}
                    title={emoji}
                    type="button"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
