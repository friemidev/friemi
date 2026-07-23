"use client";

import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  ImagePlus,
  LoaderCircle,
  SendHorizontal,
  Smile,
  X,
} from "lucide-react";
import { Button, Textarea } from "@chill-club/ui";
import { cn } from "@/lib/utils";
import {
  sendDirectMessageAction,
  type DirectMessageActionState,
} from "../actions/directMessageActions";
import { getDirectMessagesCopy } from "../copy";

export type OptimisticMessagePayload = {
  body: string;
  createdAt: string;
  imageUrls: string[];
};

type MessageComposerProps = {
  activityId?: string | null;
  conversationId: string;
  initialBody?: string;
  locale: string;
  onOptimisticCommit?: (input: {
    clientMessageId: string;
    createdAt?: string;
    messageId: string;
  }) => void;
  onOptimisticFailure?: (clientMessageId: string) => void;
  onOptimisticSend?: (payload: OptimisticMessagePayload) => string;
};

const defaultInitialState: DirectMessageActionState = {
  values: {
    body: "",
    imageUrls: [],
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
const messageImageMaxCount = 4;
const messageImageMaxSize = 4 * 1024 * 1024;
const allowedMessageImageTypes = ["image/jpeg", "image/png", "image/webp"];

function SubmitButton({
  disabled,
  isSending,
  locale,
}: {
  disabled?: boolean;
  isSending?: boolean;
  locale: string;
}) {
  const t = getDirectMessagesCopy(locale);

  return (
    <Button
      type="submit"
      disabled={disabled}
      className="h-11 min-w-11 shrink-0 rounded-full bg-moss px-0 text-white shadow-[0_12px_24px_rgba(21,98,64,0.18)] hover:bg-[#156240] sm:min-w-[5.25rem] sm:px-4"
      aria-busy={isSending}
    >
      {isSending ? (
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
      ) : (
        <SendHorizontal className="h-4 w-4" />
      )}
      <span className="hidden whitespace-nowrap sm:inline">
        {isSending ? t.sending : t.send}
      </span>
      <span className="sr-only sm:hidden">
        {isSending ? t.sending : t.send}
      </span>
    </Button>
  );
}

export function MessageComposer({
  activityId,
  conversationId,
  initialBody,
  locale,
  onOptimisticCommit,
  onOptimisticFailure,
  onOptimisticSend,
}: MessageComposerProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const emojiRootRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [bodyLength, setBodyLength] = useState(initialBody?.length ?? 0);
  const [emojiPanelOpen, setEmojiPanelOpen] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imageUploadError, setImageUploadError] = useState("");
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [formError, setFormError] = useState("");
  const [pendingSubmissionCount, setPendingSubmissionCount] = useState(0);
  const t = getDirectMessagesCopy(locale);

  useEffect(() => {
    setBodyLength(initialBody?.length ?? 0);
  }, [initialBody]);

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

  async function uploadImage(file: File) {
    if (!allowedMessageImageTypes.includes(file.type)) {
      setImageUploadError(t.imageUploadFailed);
      return;
    }

    if (file.size > messageImageMaxSize) {
      setImageUploadError(t.imageUploadFailed);
      return;
    }

    if (imageUrls.length >= messageImageMaxCount) {
      setImageUploadError(t.errors.TOO_MANY_IMAGES);
      return;
    }

    setImageUploadError("");
    setIsImageUploading(true);

    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);

      const response = await fetch("/api/uploads/direct-message-image", {
        method: "POST",
        body: uploadFormData,
      });

      if (!response.ok) {
        setImageUploadError(t.imageUploadFailed);
        return;
      }

      const json = (await response.json()) as { url?: string };

      if (!json.url) {
        setImageUploadError(t.imageUploadFailed);
        return;
      }

      setImageUrls((current) =>
        [...current, json.url as string].slice(0, messageImageMaxCount),
      );
    } catch {
      setImageUploadError(t.imageUploadFailed);
    } finally {
      setIsImageUploading(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const textarea = textareaRef.current;

    if (isImageUploading) {
      return;
    }

    const body = textarea?.value ?? "";
    const trimmedBody = body.trim();
    const submittedImageUrls = [...imageUrls];

    if (
      textarea &&
      trimmedBody.length === 0 &&
      submittedImageUrls.length === 0
    ) {
      textarea.value = "";
      setBodyLength(0);
      textarea.focus();
      setFormError("");

      return;
    }

    const submitFormData = new FormData();
    submitFormData.set("locale", locale);
    submitFormData.set("conversationId", conversationId);
    submitFormData.set("body", body);

    if (activityId) {
      submitFormData.set("activityId", activityId);
    }

    for (const imageUrl of submittedImageUrls) {
      submitFormData.append("imageUrls", imageUrl);
    }

    const clientMessageId = onOptimisticSend?.({
      body: trimmedBody,
      createdAt: new Date().toISOString(),
      imageUrls: submittedImageUrls,
    });

    formRef.current?.reset();
    if (textarea) {
      textarea.value = "";
      textarea.focus();
    }
    setBodyLength(0);
    setEmojiPanelOpen(false);
    setImageUrls([]);
    setImageUploadError("");
    setFormError("");

    setPendingSubmissionCount((count) => count + 1);
    void sendDirectMessageAction(defaultInitialState, submitFormData)
      .then((result: DirectMessageActionState) => {
        if (result.ok && result.messageId) {
          if (clientMessageId) {
            onOptimisticCommit?.({
              clientMessageId,
              createdAt: result.createdAt,
              messageId: result.messageId,
            });
          }

          return;
        }

        if (clientMessageId) {
          onOptimisticFailure?.(clientMessageId);
        }
        setFormError(result.formError ?? t.failed);
      })
      .catch(() => {
        if (clientMessageId) {
          onOptimisticFailure?.(clientMessageId);
        }
        setFormError(t.failed);
      })
      .finally(() => {
        setPendingSubmissionCount((count) => Math.max(0, count - 1));
      });
  }

  return (
    <form
      ref={formRef}
      className="relative z-20 shrink-0 border-t border-sand bg-white/92 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] backdrop-blur md:rounded-b-[1.45rem] md:pb-3"
      data-message-composer
      noValidate
      onSubmit={handleSubmit}
    >
      <input name="locale" type="hidden" value={locale} />
      <input name="conversationId" type="hidden" value={conversationId} />
      {imageUrls.map((imageUrl) => (
        <input key={imageUrl} name="imageUrls" type="hidden" value={imageUrl} />
      ))}
      <input
        ref={imageInputRef}
        accept={allowedMessageImageTypes.join(",")}
        className="hidden"
        type="file"
        onChange={(event) => {
          const file = event.target.files?.[0];

          if (file) {
            void uploadImage(file);
          }
        }}
      />
      {activityId ? (
        <input name="activityId" type="hidden" value={activityId} />
      ) : null}
      {formError ? (
        <div className="mb-2 rounded-[0.9rem] border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {formError}
        </div>
      ) : null}
      {imageUrls.length > 0 ? (
        <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
          {imageUrls.map((imageUrl, index) => (
            <div
              key={imageUrl}
              className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-sand bg-team-bg shadow-[0_10px_20px_rgba(21,98,64,0.08)]"
            >
              {/* Uploaded message images can come from public storage domains outside next/image config. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt={`${t.imageMessage} ${index + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-ink/72 text-white shadow-sm backdrop-blur transition hover:bg-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label={t.removeImage}
                title={t.removeImage}
                onClick={() =>
                  setImageUrls((current) =>
                    current.filter((currentUrl) => currentUrl !== imageUrl),
                  )
                }
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
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
        <button
          type="button"
          aria-label={isImageUploading ? t.imageUploading : t.attachImage}
          title={isImageUploading ? t.imageUploading : t.attachImage}
          disabled={
            isImageUploading || imageUrls.length >= messageImageMaxCount
          }
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-team-bg text-moss ring-1 ring-sand transition hover:bg-white hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-moss/30 disabled:cursor-not-allowed disabled:opacity-55"
          onClick={() => imageInputRef.current?.click()}
        >
          {isImageUploading ? (
            <LoaderCircle className="h-5 w-5 animate-spin" />
          ) : (
            <ImagePlus className="h-5 w-5" />
          )}
        </button>
        <label className="min-w-0 flex-1">
          <span className="sr-only">{t.messagePlaceholder}</span>
          <Textarea
            ref={textareaRef}
            name="body"
            maxLength={messageMaxLength}
            defaultValue={initialBody}
            placeholder={t.messagePlaceholder}
            className="max-h-32 min-h-11 resize-none rounded-2xl border-sand bg-[#FEFFF9] py-2.5 leading-6 shadow-inner focus-visible:ring-moss/30"
            onChange={(event) =>
              setBodyLength(event.currentTarget.value.length)
            }
          />
        </label>
        <SubmitButton
          disabled={isImageUploading}
          isSending={pendingSubmissionCount > 0}
          locale={locale}
        />
      </div>
      {imageUploadError ? (
        <p className="mt-2 text-xs font-semibold text-[#9A2135]">
          {imageUploadError}
        </p>
      ) : null}
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
