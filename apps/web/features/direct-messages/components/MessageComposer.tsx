"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  ImagePlus,
  LoaderCircle,
  SendHorizontal,
  X,
} from "lucide-react";
import { Button } from "@chill-club/ui";
import {
  acceptedImageInputTypes,
  getImageUploadClientValidationError,
} from "@/lib/image-upload-policy";
import { uploadImageWithSignedUrl } from "@/lib/signed-image-upload-client";
import { keepMobileChatPageAnchored } from "@/lib/mobile-chat-viewport";
import { cn } from "@/lib/utils";
import { splitChatMessageSubmissions } from "@/features/chat/utils/chatMessageSubmissions";
import { ChatReplyComposerPreview } from "@/features/chat/components/ChatReplyPreview";
import { ChatEmojiPicker } from "@/features/chat/components/ChatEmojiPicker";
import type { ChatReplyTarget } from "@/features/chat/types";
import {
  sendDirectMessageAction,
  type DirectMessageActionState,
} from "../actions/directMessageActions";
import { getDirectMessagesCopy } from "../copy";

export type OptimisticMessagePayload = {
  body: string;
  createdAt: string;
  imageUrls: string[];
  replyTo: ChatReplyTarget | null;
};

type MessageComposerProps = {
  activityId?: string | null;
  conversationId: string;
  disabled?: boolean;
  initialBody?: string;
  locale: string;
  onOptimisticCommit?: (input: {
    clientMessageId: string;
    createdAt?: string;
    messageId: string;
  }) => void;
  onOptimisticFailure?: (clientMessageId: string) => void;
  onOptimisticSend?: (payload: OptimisticMessagePayload) => string;
  onCancelReply: () => void;
  replyTo: ChatReplyTarget | null;
};

const defaultInitialState: DirectMessageActionState = {
  values: {
    body: "",
    imageUrls: [],
  },
};
const messageCounterThreshold = 900;
const messageMaxLength = 1000;
const messageImageMaxCount = 4;

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
      className="h-11 min-w-11 shrink-0 rounded-full bg-moss px-0 text-white shadow-[0_12px_24px_rgba(21,98,64,0.18)] hover:bg-[#156240] max-[360px]:h-10 max-[360px]:min-w-10 sm:min-w-[5.25rem] sm:px-4"
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
  disabled = false,
  initialBody,
  locale,
  onOptimisticCommit,
  onOptimisticFailure,
  onOptimisticSend,
  onCancelReply,
  replyTo,
}: MessageComposerProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [bodyLength, setBodyLength] = useState(initialBody?.length ?? 0);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imageUploadError, setImageUploadError] = useState("");
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [formError, setFormError] = useState("");
  const [pendingSubmissionCount, setPendingSubmissionCount] = useState(0);
  const t = getDirectMessagesCopy(locale);

  useEffect(() => {
    setBodyLength(initialBody?.length ?? 0);
  }, [initialBody]);

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

  async function uploadImages(files: File[]) {
    const availableCount = messageImageMaxCount - imageUrls.length;

    if (availableCount <= 0 || files.length > availableCount) {
      setImageUploadError(t.errors.TOO_MANY_IMAGES);
      return;
    }

    const validFiles = files.filter(
      (file) => !getImageUploadClientValidationError(file),
    );
    let hadUploadFailure = validFiles.length !== files.length;

    if (validFiles.length === 0) {
      setImageUploadError(t.imageUploadFailed);
      return;
    }

    setImageUploadError("");
    setIsImageUploading(true);
    try {
      for (const file of validFiles) {
        try {
          const result = await uploadImageWithSignedUrl(
            "/api/uploads/direct-message-image",
            file,
          );

          if ("error" in result) {
            hadUploadFailure = true;
            continue;
          }

          setImageUrls((current) =>
            [...new Set([...current, result.url])].slice(
              0,
              messageImageMaxCount,
            ),
          );
        } catch {
          hadUploadFailure = true;
        }
      }
    } finally {
      setImageUploadError(hadUploadFailure ? t.imageUploadFailed : "");
      setIsImageUploading(false);
      if (imageInputRef.current) {
        imageInputRef.current.value = "";
      }
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const textarea = textareaRef.current;

    if (disabled || isImageUploading) {
      return;
    }

    const body = textarea?.value ?? "";
    const submissions = splitChatMessageSubmissions(body, imageUrls);

    if (textarea && submissions.length === 0) {
      textarea.value = "";
      setBodyLength(0);
      textarea.focus();
      setFormError("");

      return;
    }

    const pendingSubmissions = submissions.map((submission, index) => ({
      ...submission,
      clientMessageId: onOptimisticSend?.({
        body: submission.body,
        createdAt: new Date(Date.now() + index).toISOString(),
        imageUrls: submission.imageUrls,
        replyTo: index === 0 ? replyTo : null,
      }),
    }));

    formRef.current?.reset();
    if (textarea) {
      textarea.value = "";
      textarea.focus();
    }
    setBodyLength(0);
    setImageUrls([]);
    setImageUploadError("");
    setFormError("");
    onCancelReply();

    setPendingSubmissionCount((count) => count + pendingSubmissions.length);
    void (async () => {
      for (const submission of pendingSubmissions) {
        const submitFormData = new FormData();
        submitFormData.set("locale", locale);
        submitFormData.set("conversationId", conversationId);
        submitFormData.set("body", submission.body);
        if (submission === pendingSubmissions[0] && replyTo) {
          submitFormData.set("replyToMessageId", replyTo.messageId);
        }
        submission.imageUrls.forEach((imageUrl) =>
          submitFormData.append("imageUrls", imageUrl),
        );

        if (activityId) {
          submitFormData.set("activityId", activityId);
        }

        try {
          const result: DirectMessageActionState =
            await sendDirectMessageAction(defaultInitialState, submitFormData);

          if (result.ok && result.messageId) {
            if (submission.clientMessageId) {
              onOptimisticCommit?.({
                clientMessageId: submission.clientMessageId,
                createdAt: result.createdAt,
                messageId: result.messageId,
              });
            }

            continue;
          }

          if (submission.clientMessageId) {
            onOptimisticFailure?.(submission.clientMessageId);
          }
          setFormError(result.formError ?? t.failed);
        } catch {
          if (submission.clientMessageId) {
            onOptimisticFailure?.(submission.clientMessageId);
          }
          setFormError(t.failed);
        }
      }
    })().finally(() => {
      setPendingSubmissionCount((count) =>
        Math.max(0, count - pendingSubmissions.length),
      );
    });
  }

  return (
    <form
      ref={formRef}
      className="relative z-20 w-full max-w-full shrink-0 border-t border-sand bg-white/92 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pl-[calc(0.75rem+env(safe-area-inset-left))] pr-[calc(0.75rem+env(safe-area-inset-right))] backdrop-blur md:rounded-b-[1.45rem] md:pb-3 md:pl-3 md:pr-3"
      data-message-composer
      noValidate
      onFocusCapture={keepMobileChatPageAnchored}
      onSubmit={handleSubmit}
    >
      <input name="locale" type="hidden" value={locale} />
      <input name="conversationId" type="hidden" value={conversationId} />
      {imageUrls.map((imageUrl) => (
        <input key={imageUrl} name="imageUrls" type="hidden" value={imageUrl} />
      ))}
      <input
        ref={imageInputRef}
        accept={acceptedImageInputTypes}
        className="hidden"
        multiple
        type="file"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);

          if (files.length > 0) {
            void uploadImages(files);
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
      {replyTo ? (
        <ChatReplyComposerPreview
          locale={locale}
          onCancel={onCancelReply}
          replyTo={replyTo}
        />
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
      <div className="flex w-full min-w-0 max-w-full items-end gap-2 max-[360px]:gap-1.5">
        <ChatEmojiPicker
          disabled={disabled}
          label={t.addEmoji}
          onSelect={insertEmoji}
        />
        <button
          type="button"
          aria-label={isImageUploading ? t.imageUploading : t.attachImage}
          title={isImageUploading ? t.imageUploading : t.attachImage}
          disabled={
            disabled ||
            isImageUploading ||
            imageUrls.length >= messageImageMaxCount
          }
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F3F6F2] text-moss ring-1 ring-[#E1E3DA] transition hover:bg-white hover:text-ink focus:outline-none focus-visible:ring-2 focus-visible:ring-moss/30 disabled:cursor-not-allowed disabled:opacity-55 max-[360px]:h-10 max-[360px]:w-10"
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
          <textarea
            ref={textareaRef}
            name="body"
            maxLength={messageMaxLength}
            rows={1}
            defaultValue={initialBody}
            disabled={disabled}
            placeholder={t.messagePlaceholder}
            className="max-h-28 min-h-11 w-full min-w-0 resize-none rounded-[1.25rem] border border-[#D6D5B2] bg-[#FEFFF9] px-4 py-3 text-sm font-semibold leading-5 text-[#111210] shadow-none outline-none placeholder:text-[#9BA08E] focus-visible:border-[#8AB68E] focus-visible:ring-2 focus-visible:ring-[#8AB68E]/20 disabled:bg-[#F1F2EC] max-[360px]:min-h-10 max-[360px]:px-3 max-[360px]:py-2.5"
            onChange={(event) =>
              setBodyLength(event.currentTarget.value.length)
            }
          />
        </label>
        <SubmitButton
          disabled={disabled || isImageUploading}
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
