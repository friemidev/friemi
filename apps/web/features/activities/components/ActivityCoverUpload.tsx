"use client";

import type { DragEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Plus, Trash2, UploadCloud } from "lucide-react";
import { Button } from "@chill-club/ui";
import { getActivityCoverDisplayUrl } from "@/lib/activity-cover-display";
import { getCopy } from "@/lib/copy";
import { cn } from "@/lib/utils";

type ActivityCoverUploadProps = {
  buttonOnlyUntilUploaded?: boolean;
  fallbackPreviewUrl?: string | null;
  initialUrl?: string | null;
  label?: string;
  locale: string;
  name?: string;
  onChange?: (url: string) => void;
  onUploadingChange?: (isUploading: boolean) => void;
  splitPreviewBelow?: boolean;
};

const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
const maxFileSize = 4 * 1024 * 1024;
type UploadErrorCode =
  | "STORAGE_NOT_CONFIGURED"
  | "MISSING_FILE"
  | "UNSUPPORTED_FILE_TYPE"
  | "FILE_TOO_LARGE"
  | "INVALID_IMAGE_CONTENT"
  | "BUCKET_NOT_AVAILABLE"
  | "UPLOAD_FAILED";

export function ActivityCoverUpload({
  buttonOnlyUntilUploaded = false,
  fallbackPreviewUrl,
  initialUrl,
  label,
  locale,
  name = "coverImageUrl",
  onChange,
  onUploadingChange,
  splitPreviewBelow = false,
}: ActivityCoverUploadProps) {
  const t = getCopy(locale).form;
  const inputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState(initialUrl ?? "");
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const displayImageUrl = getActivityCoverDisplayUrl(
    imageUrl || fallbackPreviewUrl || "",
  );

  useEffect(() => {
    setImageUrl(initialUrl ?? "");
  }, [initialUrl]);

  function updateImageUrl(url: string) {
    setImageUrl(url);
    onChange?.(url);
  }

  function getUploadErrorMessage(error?: string) {
    if (error === "UNSUPPORTED_FILE_TYPE") {
      return t.coverTypeError;
    }

    if (error === "FILE_TOO_LARGE") {
      return t.coverSizeError;
    }

    if (error === "INVALID_IMAGE_CONTENT") {
      return t.coverInvalidContentError;
    }

    if (
      error === "STORAGE_NOT_CONFIGURED" ||
      error === "BUCKET_NOT_AVAILABLE"
    ) {
      return t.coverStorageConfigError;
    }

    return t.coverUploadFailed;
  }

  async function uploadFile(file: File) {
    if (!allowedTypes.includes(file.type)) {
      setError(t.coverTypeError);
      return;
    }

    if (file.size > maxFileSize) {
      setError(t.coverSizeError);
      return;
    }

    setError("");
    setIsUploading(true);
    onUploadingChange?.(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/uploads/activity-cover", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const json = (await response.json().catch(() => null)) as {
          error?: UploadErrorCode;
        } | null;
        setError(getUploadErrorMessage(json?.error));
        return;
      }

      const json = (await response.json()) as { url?: string };

      if (!json.url) {
        setError(t.coverUploadFailed);
        return;
      }

      updateImageUrl(json.url);
    } catch {
      setError(t.coverUploadFailed);
    } finally {
      setIsUploading(false);
      onUploadingChange?.(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  }

  function handleDroppedFile(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);

    const file = event.dataTransfer.files?.[0];

    if (file && !isUploading) {
      void uploadFile(file);
    }
  }

  if (buttonOnlyUntilUploaded && splitPreviewBelow) {
    return (
      <div className="contents">
        <input name={name} type="hidden" value={imageUrl} />
        <input
          ref={inputRef}
          accept={allowedTypes.join(",")}
          className="hidden"
          type="file"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) {
              void uploadFile(file);
            }
          }}
        />
        {!displayImageUrl ? (
          <div className="grid gap-2 text-base font-semibold text-zinc-700 sm:text-lg">
            <button
              type="button"
              className={cn(
                "flex h-20 w-full items-center justify-center gap-3 rounded-2xl bg-[#F6F5F1] px-4 text-sm font-semibold text-zinc-400 shadow-[inset_0_0_0_1px_rgba(29,29,27,0.04),0_10px_24px_rgba(29,29,27,0.035)] transition hover:bg-[#F1F0EB] hover:text-zinc-600",
                isUploading && "cursor-wait opacity-80",
              )}
              disabled={isUploading}
              onClick={() => inputRef.current?.click()}
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <span>{label ?? t.coverUpload}</span>
              )}
              {isUploading ? (
                <span>{t.coverUploading}</span>
              ) : (
                <span
                  aria-hidden
                  className="grid h-8 w-8 place-items-center rounded-full bg-white text-zinc-400 shadow-sm"
                >
                  <Plus className="h-4 w-4" />
                </span>
              )}
            </button>
          </div>
        ) : null}
        {displayImageUrl ? (
          <div className="relative col-span-2 overflow-hidden rounded-2xl bg-white shadow-[0_8px_22px_rgba(29,29,27,0.08)] ring-1 ring-[#E4DDC8]">
            <button
              type="button"
              className={cn(
                "relative block h-36 w-full bg-[#F6F5F1] text-left transition sm:h-44",
                !isUploading && "cursor-pointer hover:opacity-95",
                isUploading && "cursor-wait opacity-80",
              )}
              disabled={isUploading}
              onClick={() => inputRef.current?.click()}
              aria-label={label ?? t.coverUpload}
            >
              {/* Uploaded and fallback covers can come from different public URLs. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={displayImageUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
              {isUploading ? (
                <span className="absolute inset-0 grid place-items-center bg-black/24 text-white">
                  <Loader2 className="h-6 w-6 animate-spin" aria-hidden />
                </span>
              ) : null}
            </button>
            {imageUrl ? (
              <button
                type="button"
                className="absolute right-2.5 top-2.5 z-10 rounded-full bg-[#1D1D1B]/62 px-3 py-1.5 text-xs font-black leading-none text-white shadow-[0_8px_18px_rgba(29,29,27,0.18)] backdrop-blur-md transition hover:bg-[#1D1D1B]/76 active:scale-95"
                disabled={isUploading}
                onClick={() => updateImageUrl("")}
                aria-label={t.coverRemove}
                title={t.coverRemove}
              >
                {t.coverRemove}
              </button>
            ) : null}
          </div>
        ) : null}
        {error ? (
          <p className="col-span-2 text-xs font-medium text-red-600" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      <input name={name} type="hidden" value={imageUrl} />
      <input
        ref={inputRef}
        accept={allowedTypes.join(",")}
        className="hidden"
        type="file"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) {
            void uploadFile(file);
          }
        }}
      />

      {buttonOnlyUntilUploaded ? (
        <>
          <Button
            type="button"
            variant="secondary"
            className="h-10 w-fit rounded-full border-[#8AB68E] bg-white px-4 text-base"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
          >
            {isUploading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
            ) : (
              <UploadCloud className="mr-2 h-4 w-4" aria-hidden />
            )}
            {isUploading ? t.coverUploading : t.coverUpload}
          </Button>
          {displayImageUrl ? (
            <div className="overflow-hidden rounded-xl border border-[#D6D5B2] bg-white shadow-sm">
              <div className="relative h-32 bg-[#DEEBFF]/42 sm:h-40">
                {/* Uploaded and fallback covers can come from different public URLs. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={displayImageUrl}
                  alt=""
                  className="absolute inset-0 h-full w-full object-cover"
                />
              </div>
              {imageUrl ? (
                <div className="border-t border-[#D6D5B2]/70 bg-[#FEFFF9] p-2">
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-8"
                    disabled={isUploading}
                    onClick={() => updateImageUrl("")}
                  >
                    <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                    {t.coverRemove}
                  </Button>
                </div>
              ) : null}
            </div>
          ) : null}
        </>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[#D6D5B2] bg-white shadow-sm">
          <div
            className={cn(
              "relative flex h-28 items-center justify-center bg-[#DEEBFF]/42 transition sm:h-32",
              isDragging && "bg-white ring-2 ring-inset ring-moss",
            )}
            onDragEnter={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragOver={(event) => {
              event.preventDefault();
            }}
            onDragLeave={(event) => {
              const relatedTarget = event.relatedTarget;
              if (
                !(relatedTarget instanceof Node) ||
                !event.currentTarget.contains(relatedTarget)
              ) {
                setIsDragging(false);
              }
            }}
            onDrop={handleDroppedFile}
          >
            {displayImageUrl ? (
              // Uploaded and fallback covers can come from different public URLs.
              // Native img keeps this uploader independent from remote image config.
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={displayImageUrl}
                alt=""
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="flex flex-col items-center gap-1.5 px-4 text-center text-zinc-600">
                <ImagePlus className="h-6 w-6 text-zinc-500" aria-hidden />
                <span className="text-base font-semibold text-ink">
                  {isDragging ? t.coverDropHere : t.coverDefault}
                </span>
                <span className="text-base leading-7 text-zinc-600">
                  {t.coverImageHint}
                </span>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 border-t border-[#D6D5B2]/70 bg-[#FEFFF9] p-2 sm:flex-row sm:items-center sm:justify-between">
            {buttonOnlyUntilUploaded ? null : (
              <p className="text-base leading-7 text-zinc-600">
                {t.coverFileHint}
              </p>
            )}
            <div className="flex shrink-0 gap-2">
              {imageUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  className="h-8"
                  disabled={isUploading}
                  onClick={() => updateImageUrl("")}
                >
                  <Trash2 className="mr-2 h-4 w-4" aria-hidden />
                  {t.coverRemove}
                </Button>
              ) : null}
              <Button
                type="button"
                variant="secondary"
                className="h-10 rounded-full border-[#8AB68E] bg-white px-4 text-base"
                disabled={isUploading}
                onClick={() => inputRef.current?.click()}
              >
                {isUploading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                ) : (
                  <UploadCloud className="mr-2 h-4 w-4" aria-hidden />
                )}
                {isUploading ? t.coverUploading : t.coverUpload}
              </Button>
            </div>
          </div>
        </div>
      )}

      {error ? (
        <p className="text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
