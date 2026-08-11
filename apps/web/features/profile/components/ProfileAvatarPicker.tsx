"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Camera, Check, ImagePlus, Loader2 } from "lucide-react";
import {
  acceptedImageInputTypes,
  getImageUploadClientValidationError,
} from "@/lib/image-upload-policy";
import { cn } from "@/lib/utils";
import {
  defaultProfileAvatars,
  defaultProfileAvatarsByGender,
  getDefaultProfileAvatarGender,
  type DefaultProfileAvatarGender,
} from "../defaultAvatars";

type ProfileAvatarPickerProps = {
  className?: string;
  disabled?: boolean;
  initial?: string;
  locale: string;
  hideUploadAction?: boolean;
  name?: string;
  onChange: (avatarUrl: string) => void;
  onUploadingChange?: (isUploading: boolean) => void;
  sideContent?: ReactNode;
  value: string | null;
  variant?: "inline" | "sheet";
};

function getAvatarPickerCopy(locale: string) {
  if (locale === "fr") {
    return {
      current: "Avatar actuel",
      fileHint: "JPG, PNG, WebP, GIF, HEIC · 8 Mo",
      fileTooLarge: "Image trop grande.",
      female: "Femme",
      gender: "Genre",
      invalidContent: "Image invalide.",
      male: "Homme",
      pickDefault: "Choisir un avatar",
      storageUnavailable: "Import indisponible.",
      typeError: "Format non accepté.",
      upload: "Importer",
      uploadFailed: "Import échoué.",
      uploading: "Import...",
    };
  }

  if (locale === "en") {
    return {
      current: "Current avatar",
      fileHint: "JPG, PNG, WebP, GIF, HEIC · 8 MB",
      fileTooLarge: "Image is too large.",
      female: "Female",
      gender: "Gender",
      invalidContent: "Invalid image.",
      male: "Male",
      pickDefault: "Choose avatar",
      storageUnavailable: "Upload unavailable.",
      typeError: "Unsupported format.",
      upload: "Upload",
      uploadFailed: "Upload failed.",
      uploading: "Uploading...",
    };
  }

  return {
    current: "当前头像",
    fileHint: "JPG、PNG、WebP、GIF、HEIC · 8 MB",
    fileTooLarge: "图片太大。",
    female: "女生",
    gender: "选择性别",
    invalidContent: "图片无效。",
    male: "男生",
    pickDefault: "选择头像",
    storageUnavailable: "暂时无法上传。",
    typeError: "格式不支持。",
    upload: "上传照片",
    uploadFailed: "上传失败。",
    uploading: "上传中...",
  };
}

function getUploadErrorMessage(locale: string, error?: string) {
  const copy = getAvatarPickerCopy(locale);

  if (error === "FILE_TOO_LARGE") {
    return copy.fileTooLarge;
  }

  if (error === "UNSUPPORTED_FILE_TYPE") {
    return copy.typeError;
  }

  if (error === "INVALID_IMAGE_CONTENT") {
    return copy.invalidContent;
  }

  if (error === "STORAGE_NOT_CONFIGURED" || error === "BUCKET_NOT_AVAILABLE") {
    return copy.storageUnavailable;
  }

  return copy.uploadFailed;
}

export function ProfileAvatarPicker({
  className,
  disabled = false,
  hideUploadAction = false,
  initial,
  locale,
  name,
  onChange,
  onUploadingChange,
  sideContent,
  value,
  variant = "inline",
}: ProfileAvatarPickerProps) {
  const copy = getAvatarPickerCopy(locale);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeGender, setActiveGender] = useState<DefaultProfileAvatarGender>(
    () => getDefaultProfileAvatarGender(value) ?? "female",
  );
  const [isUploading, setIsUploading] = useState(false);
  const selectedDefaultAvatar = defaultProfileAvatars.find(
    (avatar) => avatar.src === value,
  );
  const visibleDefaultAvatars = defaultProfileAvatarsByGender[activeGender];
  const isBusy = disabled || isUploading;

  useEffect(() => {
    const nextGender = getDefaultProfileAvatarGender(value);

    if (nextGender) {
      setActiveGender(nextGender);
    }
  }, [value]);

  function openFilePicker() {
    if (isBusy) {
      return;
    }

    inputRef.current?.click();
  }

  async function uploadFile(file: File) {
    const localValidationError = getImageUploadClientValidationError(
      file,
      "avatar",
    );

    if (localValidationError === "UNSUPPORTED_FILE_TYPE") {
      setError(copy.typeError);
      return;
    }

    if (localValidationError === "FILE_TOO_LARGE") {
      setError(copy.fileTooLarge);
      return;
    }

    setError(null);
    setIsUploading(true);
    onUploadingChange?.(true);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/uploads/profile-avatar", {
        method: "POST",
        body: formData,
      });
      const json = (await response.json().catch(() => null)) as
        | { error?: string; url?: string }
        | null;

      if (!response.ok || !json?.url) {
        setError(getUploadErrorMessage(locale, json?.error));
        return;
      }

      onChange(json.url);
    } catch {
      setError(copy.uploadFailed);
    } finally {
      setIsUploading(false);
      onUploadingChange?.(false);
    }
  }

  return (
    <div
      className={cn(
        "grid gap-3",
        variant === "sheet" ? "gap-4" : null,
        className,
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={acceptedImageInputTypes}
        className="hidden"
        disabled={isBusy}
        onChange={(event) => {
          const file = event.target.files?.[0];

          if (file) {
            void uploadFile(file);
          }

          event.currentTarget.value = "";
        }}
      />
      <div className="flex items-start gap-3">
        <button
          type="button"
          className={cn(
            "relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-white ring-1 ring-[#DAD9C8] transition active:scale-95 disabled:cursor-wait disabled:opacity-70",
            variant === "sheet" ? "h-20 w-20" : "h-16 w-16",
          )}
          disabled={isBusy}
          aria-label={copy.upload}
          onClick={openFilePicker}
        >
          {value ? (
            // Profile avatars may be local defaults or uploaded public URLs.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={value}
              alt={name ?? copy.current}
              className="h-full w-full object-cover"
            />
          ) : (
            <span className="grid h-full w-full place-items-center bg-[#F4F5F0] text-xl font-bold text-[#156240]">
              {initial || <Camera className="h-6 w-6" aria-hidden />}
            </span>
          )}
          <span className="absolute bottom-0 right-0 grid h-7 w-7 place-items-center rounded-full bg-[#156240] text-white ring-2 ring-white">
            {isUploading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <Camera className="h-3.5 w-3.5" aria-hidden />
            )}
          </span>
        </button>
        {sideContent ? (
          <div className="min-w-0 flex-1">{sideContent}</div>
        ) : !hideUploadAction ? (
          <div className="min-w-0">
            <button
              type="button"
              className="inline-flex h-9 items-center gap-2 rounded-full bg-[#156240] px-4 text-xs font-bold text-white transition active:scale-95 disabled:cursor-wait disabled:opacity-70"
              disabled={isBusy}
              onClick={openFilePicker}
            >
              {isUploading ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <ImagePlus className="h-4 w-4" aria-hidden />
              )}
              {isUploading ? copy.uploading : copy.upload}
            </button>
            <p className="mt-1 text-[11px] font-semibold leading-4 text-[#767A70]">
              {copy.fileHint}
            </p>
          </div>
        ) : null}
      </div>

      <div className="grid gap-2">
        <div className="grid gap-2">
          <span className="text-xs font-bold text-[#767A70]">
            {copy.gender}
          </span>
          <div className="grid grid-cols-2 gap-2 rounded-full bg-[#F4F5F0] p-1 ring-1 ring-[#E6E6E0]">
            {(
              [
                ["female", copy.female],
                ["male", copy.male],
              ] satisfies Array<[DefaultProfileAvatarGender, string]>
            ).map(([gender, label]) => {
              const active = activeGender === gender;

              return (
                <button
                  key={gender}
                  type="button"
                  className={cn(
                    "h-9 rounded-full text-sm font-bold transition active:scale-[0.98] disabled:opacity-60",
                    active
                      ? "bg-white text-[#156240] shadow-[0_6px_14px_rgba(21,98,64,0.12)]"
                      : "text-[#697066] hover:bg-white/54",
                  )}
                  disabled={isBusy}
                  onClick={() => setActiveGender(gender)}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <span className="text-xs font-bold text-[#767A70]">
          {copy.pickDefault}
        </span>
        <div
          className={cn(
            "grid gap-3",
            variant === "sheet" ? "grid-cols-3" : "grid-cols-6",
          )}
        >
          {visibleDefaultAvatars.map((avatar) => {
            const selected = selectedDefaultAvatar?.src === avatar.src;

            return (
              <button
                key={avatar.key}
                type="button"
                aria-label={avatar.key}
                className={cn(
                  "relative aspect-square min-w-0 overflow-hidden rounded-full bg-white ring-1 ring-[#DAD9C8] transition active:scale-95 disabled:opacity-60",
                  selected ? "ring-2 ring-[#156240] ring-offset-2" : null,
                )}
                disabled={isBusy}
                onClick={() => {
                  setError(null);
                  onChange(avatar.src);
                }}
              >
                {/* Default avatar assets are local public PNGs. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={avatar.src}
                  alt=""
                  className="h-full w-full object-cover"
                />
                {selected ? (
                  <span className="absolute right-0.5 top-0.5 grid h-4 w-4 place-items-center rounded-full bg-[#156240] text-white">
                    <Check className="h-3 w-3" aria-hidden />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {error ? (
        <p className="text-xs font-semibold text-[#B4233A]">{error}</p>
      ) : null}
    </div>
  );
}
