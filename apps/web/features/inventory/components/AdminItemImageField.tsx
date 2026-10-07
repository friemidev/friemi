"use client";

import Image from "next/image";
import { ImagePlus, LoaderCircle, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import {
  acceptedImageInputTypes,
  getImageUploadClientValidationError,
} from "@/lib/image-upload-policy";
import { uploadImageWithSignedUrl } from "@/lib/signed-image-upload-client";
import { getAdminItemCopy } from "../adminItemCopy";

export function AdminItemImageField({
  initialUrl = null,
  locale,
  onChange,
  onPreviewReadyChange,
  onUploadingChange,
}: {
  initialUrl?: string | null;
  locale: string;
  onChange?: (url: string) => void;
  onPreviewReadyChange?: (ready: boolean) => void;
  onUploadingChange?: (uploading: boolean) => void;
}) {
  const copy = getAdminItemCopy(locale).image;
  const inputRef = useRef<HTMLInputElement>(null);
  const [imageUrl, setImageUrl] = useState(initialUrl ?? "");
  const [uploading, setUploading] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setImageUrl(initialUrl ?? "");
    setImageFailed(false);
  }, [initialUrl]);

  function updateImage(url: string) {
    setImageUrl(url);
    setImageFailed(false);
    setError("");
    onPreviewReadyChange?.(!url);
    onChange?.(url);
  }

  async function upload(file: File) {
    const localError = getImageUploadClientValidationError(file);
    if (localError) {
      setError(
        localError === "FILE_TOO_LARGE" ? copy.tooLarge : copy.unsupportedType,
      );
      return;
    }

    setUploading(true);
    onUploadingChange?.(true);
    setError("");
    try {
      const result = await uploadImageWithSignedUrl(
        "/api/uploads/inventory-item-image",
        file,
      );
      if ("error" in result) {
        setError(
          result.error === "FILE_TOO_LARGE"
            ? copy.tooLarge
            : result.error === "STORAGE_NOT_CONFIGURED" ||
                result.error === "BUCKET_NOT_AVAILABLE"
              ? copy.storageUnavailable
              : copy.uploadFailed,
        );
        return;
      }
      updateImage(result.url);
    } catch {
      setError(copy.networkError);
    } finally {
      setUploading(false);
      onUploadingChange?.(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <input
        name="imageUrl"
        readOnly
        type="hidden"
        value={imageFailed ? "" : imageUrl}
      />
      <div className="relative grid aspect-[4/3] w-full max-w-sm place-items-center overflow-hidden rounded-xl bg-fog text-forest">
        {imageUrl && !imageFailed ? (
          <Image
            alt={copy.previewAlt}
            className="object-contain"
            fill
            onError={() => {
              setImageFailed(true);
              onPreviewReadyChange?.(false);
              setError(copy.previewFailed);
            }}
            onLoad={() => {
              onPreviewReadyChange?.(true);
              setError("");
            }}
            sizes="(max-width: 640px) 100vw, 384px"
            src={imageUrl}
            unoptimized
          />
        ) : (
          <div className="grid justify-items-center gap-2 px-4 text-center">
            <ImagePlus aria-hidden="true" className="h-9 w-9" />
            <span className="text-sm font-semibold">
              {imageFailed ? copy.brokenPreview : copy.noImage}
            </span>
          </div>
        )}
      </div>
      <input
        accept={acceptedImageInputTypes}
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void upload(file);
        }}
        ref={inputRef}
        tabIndex={-1}
        type="file"
      />
      <div className="flex flex-wrap gap-2">
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-fog px-4 text-sm font-semibold text-forest transition hover:bg-sand/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest disabled:opacity-50"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          type="button"
        >
          {uploading ? (
            <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
          ) : (
            <ImagePlus aria-hidden="true" className="h-4 w-4" />
          )}
          {uploading ? copy.uploading : imageUrl ? copy.replace : copy.upload}
        </button>
        {imageUrl ? (
          <button
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-3 text-sm font-semibold text-ink/70 transition hover:bg-fog hover:text-danger focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest disabled:opacity-50"
            disabled={uploading}
            onClick={() => updateImage("")}
            type="button"
          >
            <Trash2 aria-hidden="true" className="h-4 w-4" />
            {copy.remove}
          </button>
        ) : null}
      </div>
      <p className="text-xs leading-5 text-ink/70">{copy.hint}</p>
      {error ? (
        <p className="text-sm text-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
