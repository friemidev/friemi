"use client";

import { ImagePlus, Plus, X } from "lucide-react";
import { useRef, useState } from "react";
import { createPlanetMomentAction } from "@/features/planets/actions/planetActions";
import {
  acceptedImageInputTypes,
  getImageUploadClientValidationError,
} from "@/lib/image-upload-policy";

const maxMomentImageCount = 12;

type PlanetMomentComposerProps = {
  locale: string;
  planetId: string;
  planetSlug: string;
};

const copy = {
  "zh-CN": {
    invalidFile: "请选择支持的图片，普通图片最大 10MB，GIF 最大 20MB。",
    partialUploadFailed: "有图片上传失败，请稍后重试。",
    uploadFailed: "图片上传失败，请稍后重试。",
    createMoment: "发布精彩瞬间",
    closeComposer: "关闭发布精彩瞬间",
    close: "关闭",
    previewAlt: "待发布图片",
    removeImage: "移除图片",
    momentPlaceholder: "记录这个星球的精彩时刻，也可以只发图片。",
    uploading: "上传中...",
    addImage: "添加图片",
    submit: "发布",
  },
  en: {
    invalidFile: "Choose supported images. Regular images max 10 MB, GIF max 20 MB.",
    partialUploadFailed: "Some images failed to upload. Please try again.",
    uploadFailed: "Image upload failed. Please try again.",
    createMoment: "Create a moment",
    closeComposer: "Close moment composer",
    close: "Close",
    previewAlt: "Image to publish",
    removeImage: "Remove image",
    momentPlaceholder: "Capture a moment from this planet, or post images only.",
    uploading: "Uploading...",
    addImage: "Add images",
    submit: "Post",
  },
  fr: {
    invalidFile: "Choisissez des images prises en charge. 10 Mo max, GIF 20 Mo.",
    partialUploadFailed: "Certaines images n'ont pas pu être envoyées. Réessayez plus tard.",
    uploadFailed: "Échec de l'envoi de l'image. Réessayez plus tard.",
    createMoment: "Publier un moment",
    closeComposer: "Fermer la publication du moment",
    close: "Fermer",
    previewAlt: "Image à publier",
    removeImage: "Retirer l'image",
    momentPlaceholder: "Notez un moment de cette planète, ou publiez seulement des images.",
    uploading: "Envoi...",
    addImage: "Ajouter des images",
    submit: "Publier",
  },
} as const;

export function PlanetMomentComposer({
  locale,
  planetId,
  planetSlug,
}: PlanetMomentComposerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const t = locale === "en" || locale === "fr" ? copy[locale] : copy["zh-CN"];

  async function uploadImages(files: FileList) {
    const availableSlots = maxMomentImageCount - imageUrls.length;
    const selectedFiles = Array.from(files).slice(0, availableSlots);
    const invalidFile = selectedFiles.find((file) =>
      getImageUploadClientValidationError(file),
    );

    if (invalidFile) {
      setUploadError(t.invalidFile);
      return;
    }

    if (selectedFiles.length === 0) return;
    setIsUploading(true);
    setUploadError("");

    try {
      const uploadedUrls: string[] = [];

      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/uploads/moment-image", {
          method: "POST",
          body: formData,
        });
        const payload = (await response.json().catch(() => null)) as {
          url?: string;
        } | null;
        const imageUrl = payload?.url;

        if (!response.ok || !imageUrl) {
          setUploadError(t.partialUploadFailed);
          break;
        }

        uploadedUrls.push(imageUrl);
      }

      setImageUrls((current) =>
        [...current, ...uploadedUrls].slice(0, maxMomentImageCount),
      );
    } catch {
      setUploadError(t.uploadFailed);
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <>
      <button
        aria-label={t.createMoment}
        className="fixed bottom-[calc(6.2rem+env(safe-area-inset-bottom))] right-[max(1rem,calc((100vw-28rem)/2+1rem))] z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#156240] text-white shadow-[0_14px_30px_rgba(21,98,64,0.28)] transition active:scale-95"
        onClick={() => setIsOpen(true)}
        type="button"
      >
        <Plus className="h-7 w-7" />
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-12 backdrop-blur-sm sm:items-center sm:pb-4">
          <button
            aria-label={t.closeComposer}
            className="absolute inset-0"
            onClick={() => setIsOpen(false)}
            type="button"
          />
          <form
            action={createPlanetMomentAction}
            className="relative z-10 w-full max-w-md rounded-[1.5rem] border border-[#E7E2D6] bg-white p-4 shadow-2xl"
          >
            <input name="locale" type="hidden" value={locale} />
            <input name="planetId" type="hidden" value={planetId} />
            <input name="planetSlug" type="hidden" value={planetSlug} />
            <input
              name="imageUrls"
              type="hidden"
              value={JSON.stringify(imageUrls)}
            />
            <div className="flex items-center justify-between">
              <p className="text-base font-bold text-[#156240]">
                {t.createMoment}
              </p>
              <button
                aria-label={t.close}
                className="rounded-full p-2 text-[#8C938B]"
                onClick={() => setIsOpen(false)}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {imageUrls.length ? (
              <div className="mt-3 grid max-h-64 grid-cols-3 gap-2 overflow-y-auto bg-[#F7F7F0] p-2">
                {imageUrls.map((imageUrl) => (
                  <div className="relative aspect-square" key={imageUrl}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={t.previewAlt}
                      className="h-full w-full rounded-lg object-cover"
                      src={imageUrl}
                    />
                    <button
                      aria-label={t.removeImage}
                      className="absolute -right-1 -top-1 rounded-full bg-[#9A2135] p-1 text-white"
                      onClick={() =>
                        setImageUrls((current) =>
                          current.filter((url) => url !== imageUrl),
                        )
                      }
                      type="button"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : null}

            <textarea
              className="mt-3 min-h-20 w-full resize-none rounded-xl border border-[#E7E2D6] bg-white px-3 py-2.5 text-sm outline-none placeholder:text-[#A5A29A]"
              maxLength={2000}
              name="content"
              placeholder={t.momentPlaceholder}
            />
            <div className="mt-2 flex items-center justify-between gap-3">
              <input
                ref={inputRef}
                accept={acceptedImageInputTypes}
                className="hidden"
                multiple
                type="file"
                onChange={(event) => {
                  const files = event.target.files;
                  if (files) void uploadImages(files);
                }}
              />
              <button
                className="inline-flex min-w-0 items-center gap-1.5 text-xs font-bold text-[#47715B] disabled:opacity-50"
                disabled={isUploading || imageUrls.length >= maxMomentImageCount}
                onClick={() => inputRef.current?.click()}
                type="button"
              >
                <ImagePlus className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {isUploading
                    ? t.uploading
                    : `${t.addImage}${imageUrls.length ? ` (${imageUrls.length}/${maxMomentImageCount})` : ""}`}
                </span>
              </button>
              <button
                className="shrink-0 rounded-full bg-[#156240] px-5 py-2 text-xs font-bold text-white disabled:opacity-50"
                disabled={isUploading}
                type="submit"
              >
                {t.submit}
              </button>
            </div>
            {uploadError ? (
              <p className="mt-2 text-xs font-semibold text-[#9A2135]">
                {uploadError}
              </p>
            ) : null}
          </form>
        </div>
      ) : null}
    </>
  );
}
