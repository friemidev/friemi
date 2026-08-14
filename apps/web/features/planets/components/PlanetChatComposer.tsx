"use client";

import { LoaderCircle, Send } from "lucide-react";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState } from "react";
import { ChatEmojiPicker } from "@/features/chat/components/ChatEmojiPicker";
import {
  ChatImageAttachmentPicker,
  ChatImageAttachmentPreviews,
} from "@/features/chat/components/ChatImageAttachmentPicker";
import {
  sendPlanetMessageAction,
  type PlanetChatActionState,
} from "@/features/planets/actions/planetActions";
import { keepMobileChatPageAnchored } from "@/lib/mobile-chat-viewport";

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
  };
}

export function PlanetChatComposer({
  locale,
  planetId,
  planetSlug,
}: PlanetChatComposerProps) {
  const copy = getCopy(locale);
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [content, setContent] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isImageUploading, setIsImageUploading] = useState(false);
  const initialState: PlanetChatActionState = {};
  const [state, formAction, isPending] = useActionState(
    sendPlanetMessageAction,
    initialState,
  );

  useEffect(() => {
    if (!state.ok || !state.messageId) return;

    formRef.current?.reset();
    setContent("");
    setImageUrls([]);
    router.refresh();
    keepMobileChatPageAnchored();
  }, [router, state.messageId, state.ok]);

  function insertEmoji(emoji: string) {
    const input = inputRef.current;
    const start = input?.selectionStart ?? content.length;
    const end = input?.selectionEnd ?? content.length;
    const nextContent =
      `${content.slice(0, start)}${emoji}${content.slice(end)}`.slice(0, 1000);
    setContent(nextContent);
    window.requestAnimationFrame(() => {
      const cursor = Math.min(start + emoji.length, nextContent.length);
      input?.focus();
      input?.setSelectionRange(cursor, cursor);
    });
  }

  return (
    <div>
      <form
        action={formAction}
        className="grid gap-2"
        data-planet-chat-composer
        ref={formRef}
      >
        <input name="locale" type="hidden" value={locale} />
        <input name="planetId" type="hidden" value={planetId} />
        <input name="planetSlug" type="hidden" value={planetSlug} />
        {imageUrls.map((imageUrl) => (
          <input
            key={imageUrl}
            name="imageUrls"
            type="hidden"
            value={imageUrl}
          />
        ))}
        <ChatImageAttachmentPreviews
          imageLabel={copy.image}
          imageUrls={imageUrls}
          onChange={setImageUrls}
          removeLabel={copy.removeImage}
        />
        <div className="flex items-center gap-2">
          <ChatEmojiPicker
            disabled={isPending}
            label={copy.addEmoji}
            onSelect={insertEmoji}
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
          <input
            className="min-w-0 flex-1 rounded-full border border-[#E7E2D6] bg-white px-4 py-2.5 text-sm outline-none placeholder:text-[#A5A29A] focus:border-[#8AB68E] disabled:bg-[#F4F4F0]"
            disabled={isPending}
            maxLength={1000}
            name="content"
            onChange={(event) => setContent(event.target.value)}
            onFocus={keepMobileChatPageAnchored}
            placeholder={copy.placeholder}
            ref={inputRef}
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
