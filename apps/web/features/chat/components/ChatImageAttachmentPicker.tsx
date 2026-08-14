"use client";

import { ImagePlus, LoaderCircle, X } from "lucide-react";
import { useRef, useState } from "react";
import {
  acceptedImageInputTypes,
  getImageUploadClientValidationError,
} from "@/lib/image-upload-policy";

export const chatImageMaxCount = 4;

type ChatImageAttachmentPickerProps = {
  attachLabel: string;
  disabled?: boolean;
  imageLabel: string;
  imageUrls: string[];
  onChange: (imageUrls: string[]) => void;
  onUploadingChange?: (uploading: boolean) => void;
  removeLabel: string;
  tooManyLabel: string;
  uploadFailedLabel: string;
  uploadingLabel: string;
};

export function ChatImageAttachmentPreviews({
  imageLabel,
  imageUrls,
  onChange,
  removeLabel,
}: {
  imageLabel: string;
  imageUrls: string[];
  onChange: (imageUrls: string[]) => void;
  removeLabel: string;
}) {
  if (!imageUrls.length) return null;

  return (
    <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
      {imageUrls.map((imageUrl, index) => (
        <div
          className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg bg-[#F3F6F2] ring-1 ring-[#E1E3DA]"
          key={imageUrl}
        >
          {/* Public chat images can be served by the configured storage host. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            alt={`${imageLabel} ${index + 1}`}
            className="h-full w-full object-cover"
            src={imageUrl}
          />
          <button
            aria-label={removeLabel}
            className="absolute right-1 top-1 inline-flex h-6 w-6 items-center justify-center rounded-full bg-black/68 text-white shadow-sm transition hover:bg-black focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
            onClick={() =>
              onChange(imageUrls.filter((url) => url !== imageUrl))
            }
            title={removeLabel}
            type="button"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

export function ChatImageAttachmentPicker({
  attachLabel,
  disabled = false,
  imageLabel,
  imageUrls,
  onChange,
  onUploadingChange,
  removeLabel,
  tooManyLabel,
  uploadFailedLabel,
  uploadingLabel,
}: ChatImageAttachmentPickerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);

  async function uploadFiles(files: File[]) {
    const availableCount = chatImageMaxCount - imageUrls.length;

    if (availableCount <= 0 || files.length > availableCount) {
      setError(tooManyLabel);
      return;
    }

    if (files.some((file) => getImageUploadClientValidationError(file))) {
      setError(uploadFailedLabel);
      return;
    }

    setError("");
    setUploading(true);
    onUploadingChange?.(true);

    const uploadedUrls: string[] = [];
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/uploads/chat-image", {
          body: formData,
          method: "POST",
        });
        const payload = response.ok
          ? ((await response.json()) as { url?: string })
          : null;

        if (!payload?.url) throw new Error("CHAT_IMAGE_UPLOAD_FAILED");
        uploadedUrls.push(payload.url);
      }

      onChange(
        [...new Set([...imageUrls, ...uploadedUrls])].slice(
          0,
          chatImageMaxCount,
        ),
      );
    } catch {
      if (uploadedUrls.length) {
        onChange(
          [...new Set([...imageUrls, ...uploadedUrls])].slice(
            0,
            chatImageMaxCount,
          ),
        );
      }
      setError(uploadFailedLabel);
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex min-w-0 items-center gap-2">
      <input
        accept={acceptedImageInputTypes}
        className="hidden"
        multiple
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          if (files.length) void uploadFiles(files);
        }}
        ref={inputRef}
        type="file"
      />
      <button
        aria-label={uploading ? uploadingLabel : attachLabel}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#F3F6F2] text-[#156240] ring-1 ring-[#E1E3DA] transition hover:bg-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#156240]/30 disabled:cursor-not-allowed disabled:opacity-50"
        disabled={
          disabled || uploading || imageUrls.length >= chatImageMaxCount
        }
        onClick={() => inputRef.current?.click()}
        title={uploading ? uploadingLabel : attachLabel}
        type="button"
      >
        {uploading ? (
          <LoaderCircle className="h-5 w-5 animate-spin" />
        ) : (
          <ImagePlus className="h-5 w-5" />
        )}
      </button>
      {error ? (
        <p
          aria-live="polite"
          className="max-w-28 text-xs font-semibold leading-4 text-[#9A2135]"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
