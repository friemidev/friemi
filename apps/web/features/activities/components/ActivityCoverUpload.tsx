"use client";

import type { DragEvent } from "react";
import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Trash2, UploadCloud } from "lucide-react";
import { Button } from "@chill-club/ui";
import { getActivityCoverDisplayUrl } from "@/lib/activity-cover-display";
import { getCopy } from "@/lib/copy";
import { cn } from "@/lib/utils";

type ActivityCoverUploadProps = {
  initialUrl?: string | null;
  locale: string;
  name?: string;
  onChange?: (url: string) => void;
  onUploadingChange?: (isUploading: boolean) => void;
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
  initialUrl,
  locale,
  name = "coverImageUrl",
  onChange,
  onUploadingChange,
}: ActivityCoverUploadProps) {
  const t = getCopy(locale).form;
  const inputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState(initialUrl ?? "");
  const [error, setError] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const displayImageUrl = getActivityCoverDisplayUrl(imageUrl);

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

      <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
        <div
          className={cn(
            "relative flex aspect-[16/9] min-h-44 items-center justify-center bg-sky/60 transition",
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
          {imageUrl ? (
            // Supabase Storage returns public image URLs. Native img keeps this
            // uploader independent from Next remote image domain config.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={displayImageUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center gap-2 px-4 text-center text-zinc-600">
              <ImagePlus className="h-9 w-9 text-zinc-500" aria-hidden />
              <span className="text-sm font-medium text-ink">
                {isDragging ? t.coverDropHere : t.coverDefault}
              </span>
              <span className="text-xs leading-5 text-zinc-500">
                {t.coverImageHint}
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2 border-t border-zinc-100 p-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs leading-5 text-zinc-500">{t.coverFileHint}</p>
          <div className="flex shrink-0 gap-2">
            {imageUrl ? (
              <Button
                type="button"
                variant="ghost"
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

      {error ? (
        <p className="text-xs font-medium text-red-600" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
