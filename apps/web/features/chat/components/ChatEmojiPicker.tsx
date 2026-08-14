"use client";

import { Smile } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

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
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    function closeOnOutsidePointer(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
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

  return (
    <div className="relative shrink-0" ref={rootRef}>
      <button
        aria-expanded={open}
        aria-label={label}
        className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-[#F3F6F2] text-[#156240] ring-1 ring-[#E1E3DA] transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156240]/30 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        title={label}
        type="button"
      >
        <Smile className="h-5 w-5" />
      </button>
      {open && !disabled ? (
        <div
          className={cn(
            "absolute bottom-[calc(100%+0.55rem)] z-40 w-[min(20rem,calc(100vw-2rem))] rounded-lg border border-[#E1E3DA] bg-white p-2.5 shadow-[0_18px_38px_rgba(21,98,64,0.16)]",
            align === "right" ? "right-0" : "left-0",
          )}
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
        </div>
      ) : null}
    </div>
  );
}
