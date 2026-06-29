"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle, SendHorizontal, Smile } from "lucide-react";
import { Button, Textarea } from "@chill-club/ui";
import { cn } from "@/lib/utils";
import {
  sendDirectMessageAction,
  type DirectMessageActionState,
} from "../actions/directMessageActions";
import { getDirectMessagesCopy } from "../copy";

type MessageComposerProps = {
  activityId?: string | null;
  conversationId: string;
  initialBody?: string;
  locale: string;
};

const defaultInitialState: DirectMessageActionState = {
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
      className="h-11 min-w-11 shrink-0 rounded-full bg-moss px-0 text-white shadow-[0_12px_24px_rgba(21,98,64,0.18)] hover:bg-[#156240] sm:min-w-[5.25rem] sm:px-4"
      aria-busy={pending}
    >
      {pending ? (
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <SendHorizontal className="h-4 w-4" />
      )}
      <span className="hidden whitespace-nowrap sm:inline">
        {pending ? t.sending : t.send}
      </span>
      <span className="sr-only sm:hidden">{pending ? t.sending : t.send}</span>
    </Button>
  );
}

export function MessageComposer({
  activityId,
  conversationId,
  initialBody,
  locale,
}: MessageComposerProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const emojiRootRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [bodyLength, setBodyLength] = useState(initialBody?.length ?? 0);
  const [emojiPanelOpen, setEmojiPanelOpen] = useState(false);
  const [state, formAction] = useActionState(sendDirectMessageAction, {
    ...defaultInitialState,
    values: {
      body: initialBody ?? "",
    },
  });
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

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    const textarea = textareaRef.current;

    if (textarea && textarea.value.trim().length === 0) {
      event.preventDefault();
      textarea.value = "";
      setBodyLength(0);
      textarea.focus();
    }
  }

  return (
    <form
      ref={formRef}
      action={formAction}
      className="relative z-20 shrink-0 border-t border-sand bg-white/92 p-3 backdrop-blur md:rounded-b-[1.45rem]"
      data-message-composer
      noValidate
      onSubmit={handleSubmit}
    >
      <input name="locale" type="hidden" value={locale} />
      <input name="conversationId" type="hidden" value={conversationId} />
      {activityId ? (
        <input name="activityId" type="hidden" value={activityId} />
      ) : null}
      {state.formError ? (
        <div className="mb-2 rounded-[0.9rem] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.formError}
        </div>
      ) : null}
      <div className="flex min-w-0 items-center gap-2 sm:gap-3">
        <div ref={emojiRootRef} className="relative shrink-0">
          <button
            type="button"
            aria-expanded={emojiPanelOpen}
            aria-label={t.addEmoji}
            title={t.addEmoji}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-team-bg text-moss ring-1 ring-sand transition hover:bg-white hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-moss/30"
            onClick={() => setEmojiPanelOpen((current) => !current)}
          >
            <Smile className="h-5 w-5" />
          </button>
          {emojiPanelOpen ? (
            <div className="absolute bottom-[calc(100%+0.5rem)] left-0 z-30 w-[min(20rem,calc(100vw-2rem))] rounded-[1.1rem] border border-sand bg-white p-3 shadow-[0_18px_34px_rgba(21,98,64,0.14)]">
              <p className="px-1 text-xs font-medium text-[#156240]">
                {t.addEmoji}
              </p>
              <div className="mt-2 grid grid-cols-7 gap-1.5 sm:grid-cols-8">
                {emojiOptions.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    className="inline-flex h-8 w-8 items-center justify-center rounded-full text-lg transition hover:bg-team-bg focus:outline-none focus-visible:ring-2 focus-visible:ring-moss/30"
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
            defaultValue={state.ok ? "" : state.values?.body ?? initialBody}
            placeholder={t.messagePlaceholder}
            className="max-h-32 min-h-11 resize-none rounded-2xl border-sand bg-[#FEFFF9] py-2.5 leading-6 shadow-inner focus-visible:ring-moss/30"
            onChange={(event) => setBodyLength(event.currentTarget.value.length)}
          />
        </label>
        <SubmitButton locale={locale} />
      </div>
      {showCounter ? (
        <p
          className={cn(
            "mt-2 text-right text-xs leading-5",
            bodyLength >= messageMaxLength ? "text-clay" : "text-[#8E8383]",
          )}
        >
          {bodyLength}/{messageMaxLength}
        </p>
      ) : null}
    </form>
  );
}
