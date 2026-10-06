"use client";

import { LoaderCircle, Send } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ChatMentionPicker } from "@/features/chat/components/ChatMentionPicker";
import { useChatTextareaAutosize } from "@/features/chat/useChatTextareaAutosize";
import {
  ChatImageAttachmentPicker,
  ChatImageAttachmentPreviews,
} from "@/features/chat/components/ChatImageAttachmentPicker";
import type { ChatMentionMember } from "@/features/chat/types";
import {
  getChatMentionEveryoneToken,
  getChatMentionMemberToken,
  shouldOpenChatMentionPicker,
} from "@/features/chat/utils/chatMentions";
import {
  sendPlanetMessageAction,
  type PlanetChatActionState,
} from "@/features/planets/actions/planetActions";
import { keepMobileChatPageAnchored } from "@/lib/mobile-chat-viewport";
import { dispatchChatCursorWake } from "@/features/chat/chatCursorSync";
import { splitChatMessageSubmissions } from "@/features/chat/utils/chatMessageSubmissions";
import { ChatReplyComposerPreview } from "@/features/chat/components/ChatReplyPreview";
import {
  chatReplyRequestEvent,
  type ChatReplyRequestDetail,
} from "@/features/chat/chatReplyEvents";
import type { ChatReplyTarget } from "@/features/chat/types";

type PlanetChatComposerProps = {
  locale: string;
  planetId: string;
  planetSlug: string;
};

function getCopy(locale: string) {
  if (locale === "fr") {
    return {
      placeholder: "Écrivez un message...",
      send: "Envoyer le message",
      addEmoji: "Ajouter emoji",
      attachImage: "Ajouter une image",
      image: "Image",
      removeImage: "Retirer l'image",
      tooManyImages: "Vous pouvez envoyer jusqu'à 4 images.",
      uploadFailed: "Image impossible à importer.",
      uploading: "Import...",
      sendFailed: "Le message n'a pas pu être envoyé.",
    };
  }

  if (locale === "en") {
    return {
      placeholder: "Write a message...",
      send: "Send message",
      addEmoji: "Add emoji",
      attachImage: "Add image",
      image: "Image",
      removeImage: "Remove image",
      tooManyImages: "You can send up to 4 images.",
      uploadFailed: "Image could not be uploaded.",
      uploading: "Uploading...",
      sendFailed: "Message could not be sent.",
    };
  }

  return {
    placeholder: "输入消息...",
    send: "发送消息",
    addEmoji: "添加表情",
    attachImage: "添加图片",
    image: "图片",
    removeImage: "移除图片",
    tooManyImages: "一次最多发送 4 张图片。",
    uploadFailed: "图片上传失败，请稍后再试。",
    uploading: "上传中...",
    sendFailed: "消息发送失败，请稍后再试。",
  };
}

export function PlanetChatComposer({
  locale,
  planetId,
  planetSlug,
}: PlanetChatComposerProps) {
  const copy = getCopy(locale);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const mentionCursorRef = useRef(0);
  const [content, setContent] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const [mentionPickerOpen, setMentionPickerOpen] = useState(false);
  const [mentionedMembers, setMentionedMembers] = useState<ChatMentionMember[]>(
    [],
  );
  const [mentionsEveryone, setMentionsEveryone] = useState(false);
  const initialState: PlanetChatActionState = {};
  const [state, setState] = useState<PlanetChatActionState>(initialState);
  const [isPending, setIsPending] = useState(false);
  const [replyTo, setReplyTo] = useState<ChatReplyTarget | null>(null);

  useChatTextareaAutosize(inputRef, content);

  useEffect(() => {
    function handleReplyRequest(event: Event) {
      const detail = (event as CustomEvent<ChatReplyRequestDetail>).detail;

      if (detail.scopeId !== planetId) {
        return;
      }

      setReplyTo(detail.replyTo);
      window.requestAnimationFrame(() => inputRef.current?.focus());
    }

    window.addEventListener(chatReplyRequestEvent, handleReplyRequest);
    return () =>
      window.removeEventListener(chatReplyRequestEvent, handleReplyRequest);
  }, [planetId]);

  function insertMentionToken(token: string) {
    const input = inputRef.current;
    const cursor = mentionCursorRef.current;
    const tokenStart = content[cursor - 1] === "@" ? cursor - 1 : cursor;
    const suffix = content.slice(cursor);
    const nextContent =
      `${content.slice(0, tokenStart)}${token} ${suffix}`.slice(0, 1000);
    const nextCursor = Math.min(
      tokenStart + token.length + 1,
      nextContent.length,
    );

    setContent(nextContent);
    window.requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(nextCursor, nextCursor);
    });
  }

  function handleSelectMember(member: ChatMentionMember) {
    const token = getChatMentionMemberToken(member);
    const hasPendingAt = content[mentionCursorRef.current - 1] === "@";

    if (hasPendingAt || !content.includes(token)) {
      insertMentionToken(token);
    }

    setMentionedMembers((current) =>
      current.some((item) => item.id === member.id)
        ? current
        : [...current, member],
    );
  }

  function handleSelectEveryone() {
    const token = getChatMentionEveryoneToken(locale);
    const hasPendingAt = content[mentionCursorRef.current - 1] === "@";

    if (hasPendingAt || !content.includes(token)) {
      insertMentionToken(token);
    }

    setMentionsEveryone(true);
  }

  function handleContentChange(nextContent: string, cursor: number) {
    const previousContent = content;
    setContent(nextContent);
    setMentionedMembers((current) =>
      current.filter((member) =>
        nextContent.includes(getChatMentionMemberToken(member)),
      ),
    );

    const everyoneToken = getChatMentionEveryoneToken(locale);
    if (!nextContent.includes(everyoneToken)) {
      setMentionsEveryone(false);
    }

    if (shouldOpenChatMentionPicker(previousContent, nextContent, cursor)) {
      mentionCursorRef.current = cursor;
      setMentionPickerOpen(true);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isPending || isImageUploading) {
      return;
    }

    const submissions = splitChatMessageSubmissions(content, imageUrls);

    if (submissions.length === 0) {
      return;
    }

    setIsPending(true);
    setState(initialState);
    formRef.current?.reset();
    setContent("");
    setImageUrls([]);
    setMentionedMembers([]);
    setMentionsEveryone(false);
    setReplyTo(null);

    void (async () => {
      let failed = false;

      for (const [index, submission] of submissions.entries()) {
        const formData = new FormData();
        formData.set("locale", locale);
        formData.set("planetId", planetId);
        formData.set("planetSlug", planetSlug);
        formData.set("content", submission.body);
        if (index === 0 && replyTo) {
          formData.set("replyToMessageId", replyTo.messageId);
        }
        formData.set(
          "mentionsEveryone",
          index === 0 && mentionsEveryone ? "1" : "0",
        );
        submission.imageUrls.forEach((imageUrl) =>
          formData.append("imageUrls", imageUrl),
        );
        if (index === 0) {
          mentionedMembers.forEach((member) =>
            formData.append("mentionedProfileIds", member.id),
          );
        }

        try {
          const result = await sendPlanetMessageAction(initialState, formData);

          if (!result.ok) {
            failed = true;
            setState(result);
          }
        } catch {
          failed = true;
          setState({ formError: copy.sendFailed });
        }
      }

      if (!failed) {
        setState({ ok: true });
      }

      dispatchChatCursorWake(planetId);
      keepMobileChatPageAnchored();
    })().finally(() => setIsPending(false));
  }

  return (
    <div>
      <form
        className="grid min-w-0 w-full gap-2"
        data-planet-chat-composer
        onSubmit={handleSubmit}
        ref={formRef}
      >
        <input name="locale" type="hidden" value={locale} />
        <input name="planetId" type="hidden" value={planetId} />
        <input name="planetSlug" type="hidden" value={planetSlug} />
        <input
          name="mentionsEveryone"
          type="hidden"
          value={mentionsEveryone ? "1" : "0"}
        />
        {mentionedMembers.map((member) => (
          <input
            key={member.id}
            name="mentionedProfileIds"
            type="hidden"
            value={member.id}
          />
        ))}
        {imageUrls.map((imageUrl) => (
          <input
            key={imageUrl}
            name="imageUrls"
            type="hidden"
            value={imageUrl}
          />
        ))}
        {replyTo ? (
          <ChatReplyComposerPreview
            locale={locale}
            onCancel={() => setReplyTo(null)}
            replyTo={replyTo}
          />
        ) : null}
        <ChatImageAttachmentPreviews
          imageLabel={copy.image}
          imageUrls={imageUrls}
          onChange={setImageUrls}
          removeLabel={copy.removeImage}
        />
        <div className="grid min-w-0 w-full grid-cols-[2.75rem_minmax(0,1fr)_2.5rem] items-end gap-1.5">
          <ChatMentionPicker
            locale={locale}
            onOpenChange={setMentionPickerOpen}
            onSelectEveryone={handleSelectEveryone}
            onSelectMember={handleSelectMember}
            open={mentionPickerOpen}
            roomId={planetId}
            scopeKind="planet"
            selectedProfileIds={mentionedMembers.map((member) => member.id)}
          />
          <ChatImageAttachmentPicker
            attachLabel={copy.attachImage}
            disabled={isPending}
            imageLabel={copy.image}
            imageUrls={imageUrls}
            onChange={setImageUrls}
            onUploadingChange={setIsImageUploading}
            removeLabel={copy.removeImage}
            tooManyLabel={copy.tooManyImages}
            uploadFailedLabel={copy.uploadFailed}
            uploadingLabel={copy.uploading}
          />
          <textarea
            className="chat-composer-input"
            disabled={isPending}
            maxLength={1000}
            name="content"
            onChange={(event) =>
              handleContentChange(
                event.target.value,
                event.target.selectionStart ?? event.target.value.length,
              )
            }
            onFocus={keepMobileChatPageAnchored}
            placeholder={copy.placeholder}
            ref={inputRef}
            rows={1}
            value={content}
          />
          <button
            aria-busy={isPending}
            aria-label={copy.send}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#156240] text-white transition active:scale-95 disabled:cursor-wait disabled:opacity-60"
            disabled={
              isPending ||
              isImageUploading ||
              (!content.trim() && imageUrls.length === 0)
            }
            type="submit"
          >
            {isPending ? (
              <LoaderCircle className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </form>
      {state.formError ? (
        <p
          aria-live="polite"
          className="mt-2 px-2 text-xs font-bold text-[#A52B3B]"
        >
          {state.formError}
        </p>
      ) : null}
    </div>
  );
}
