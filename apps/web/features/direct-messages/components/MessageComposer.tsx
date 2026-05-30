"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { SendHorizontal, Smile } from "lucide-react";
import { Button, Textarea } from "@chill-club/ui";
import { cn } from "@/lib/utils";
import {
  sendDirectMessageAction,
  type DirectMessageActionState,
} from "../actions/directMessageActions";
import { getDirectMessagesCopy } from "../copy";

type MessageComposerProps = {
  conversationId: string;
  locale: string;
};

const initialState: DirectMessageActionState = {
  values: {
    body: "",
  },
};
const emojiOptions = [
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
];
const messageCounterThreshold = 900;
const messageMaxLength = 1000;

function SubmitButton({ locale }: { locale: string }) {
  const { pending } = useFormStatus();
  const t = getDirectMessagesCopy(locale);

  return (
    <Button
      type="submit"
      disabled={pending}
      className="h-11 shrink-0 gap-2 px-4"
    >
      <SendHorizontal className="h-4 w-4" />
      <span className="hidden whitespace-nowrap sm:inline">
        {pending ? t.sending : t.send}
      </span>
      <span className="sr-only sm:hidden">{pending ? t.sending : t.send}</span>
    </Button>
  );
}

export function MessageComposer({
  conversationId,
  locale,
}: MessageComposerProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const emojiRootRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [bodyLength, setBodyLength] = useState(
    initialState.values?.body?.length ?? 0,
  );
  const [emojiPanelOpen, setEmojiPanelOpen] = useState(false);
  const [state, formAction] = useActionState(
    sendDirectMessageAction,
    initialState,
  );
  const t = getDirectMessagesCopy(locale);

  useEffect(() => {
    if (state.ok) {
      formRef.current?.reset();
      setBodyLength(0);
      setEmojiPanelOpen(false);
      return;
    }

    setBodyLength(state.values?.body?.length ?? 0);
  }, [state.ok, state.values?.body]);

  useEffect(() => {
    if (!emojiPanelOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!emojiRootRef.current?.contains(event.target as Node)) {
        setEmojiPanelOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setEmojiPanelOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [emojiPanelOpen]);

  function insertEmoji(emoji: string) {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const nextValue =
      textarea.value.slice(0, start) + emoji + textarea.value.slice(end);

    textarea.value = nextValue.slice(0, messageMaxLength);
    setBodyLength(textarea.value.length);
    textarea.focus();
    const nextCursor = Math.min(start + emoji.length, textarea.value.length);
    textarea.setSelectionRange(nextCursor, nextCursor);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  }

  const showCounter = bodyLength >= messageCounterThreshold;

  return (
    <form
      ref={formRef}
      action={formAction}
      className="relative z-20 shrink-0 border-t border-black/10 bg-white/95 p-3 backdrop-blur md:rounded-b-lg"
      data-message-composer
      noValidate
    >
      <input name="locale" type="hidden" value={locale} />
      <input name="conversationId" type="hidden" value={conversationId} />
      {state.formError ? (
        <div className="mb-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.formError}
        </div>
      ) : null}
      <div className="flex min-w-0 items-end gap-2">
        <div ref={emojiRootRef} className="relative shrink-0">
          <button
            type="button"
            aria-expanded={emojiPanelOpen}
            aria-label={t.addEmoji}
            title={t.addEmoji}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-zinc-50 text-zinc-700 ring-1 ring-black/10 transition hover:bg-white hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
            onClick={() => setEmojiPanelOpen((current) => !current)}
          >
            <Smile className="h-5 w-5" />
          </button>
          {emojiPanelOpen ? (
            <div className="absolute bottom-[calc(100%+0.5rem)] left-0 z-30 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-black/10 bg-white p-3 shadow-xl">
              <p className="px-1 text-xs font-medium text-zinc-500">
                {t.addEmoji}
              </p>
              <div className="mt-2 grid grid-cols-7 gap-1.5 sm:grid-cols-8">
                {emojiOptions.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-lg transition hover:bg-zinc-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-zinc-300"
                    aria-label={`${t.addEmoji} ${emoji}`}
                    title={`${t.addEmoji} ${emoji}`}
                    onClick={() => insertEmoji(emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
        <label className="min-w-0 flex-1">
          <span className="sr-only">{t.messagePlaceholder}</span>
          <Textarea
            ref={textareaRef}
            key={state.messageId ?? "new-message"}
            name="body"
            maxLength={messageMaxLength}
            defaultValue={state.ok ? "" : state.values?.body}
            placeholder={t.messagePlaceholder}
            className="max-h-32 min-h-11 resize-none bg-white py-2.5"
            onChange={(event) => setBodyLength(event.currentTarget.value.length)}
          />
        </label>
        <SubmitButton locale={locale} />
      </div>
      {showCounter ? (
        <p
          className={cn(
            "mt-2 text-right text-xs leading-5",
            bodyLength >= messageMaxLength ? "text-clay" : "text-zinc-500",
          )}
        >
          {bodyLength}/{messageMaxLength}
        </p>
      ) : null}
      {state.fieldErrors?.body?.[0] ? (
        <p className="mt-1 text-xs font-medium text-red-600">
          {state.fieldErrors.body[0]}
        </p>
      ) : null}
    </form>
  );
}
