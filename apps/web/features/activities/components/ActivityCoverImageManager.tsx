"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { Check, ImageUp, Loader2, RotateCcw, X } from "lucide-react";
import { ActivityCoverUpload } from "@/features/activities/components/ActivityCoverUpload";
import {
  updateActivityCoverImageAction,
  type UpdateActivityCoverImageState,
} from "@/features/activities/actions/updateActivityCoverImage";
import { cn } from "@/lib/utils";

type ActivityCoverImageManagerProps = {
  activityId: string;
  className?: string;
  compact?: boolean;
  fallbackCoverImageUrl?: string | null;
  initialCoverImageUrl?: string | null;
  locale: string;
  triggerTone?: "card" | "detail";
};

const initialState: UpdateActivityCoverImageState = {};

function getCoverManagerCopy(locale: string) {
  if (locale === "fr") {
    return {
      close: "Fermer",
      description:
        "Cette image s'affiche seulement sur ce plan. L'activite d'origine ne sera pas modifiee.",
      remove: "Revenir a l'image d'origine",
      save: "Enregistrer",
      saving: "Enregistrement...",
      success: "Image mise a jour.",
      title: "Image du plan",
      trigger: "Changer l'image",
      triggerShort: "Image",
    };
  }

  if (locale === "en") {
    return {
      close: "Close",
      description:
        "This image only changes this crew card. The original activity cover stays untouched.",
      remove: "Restore original cover",
      save: "Save",
      saving: "Saving...",
      success: "Cover updated.",
      title: "Crew cover",
      trigger: "Change cover",
      triggerShort: "Cover",
    };
  }

  return {
    close: "关闭",
    description: "这张图只影响当前组局卡片和详情页，不会修改原活动封面。",
    remove: "恢复系统封面",
    save: "保存预览图",
    saving: "保存中...",
    success: "预览图已更新。",
    title: "组局预览图",
    trigger: "换预览图",
    triggerShort: "换图",
  };
}

function CoverManagerSubmitButton({
  disabled,
  locale,
}: {
  disabled?: boolean;
  locale: string;
}) {
  const { pending } = useFormStatus();
  const copy = getCoverManagerCopy(locale);

  return (
    <button
      type="submit"
      disabled={disabled || pending}
      className="inline-flex h-11 items-center justify-center rounded-full bg-coral px-5 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(216,141,114,0.24)] transition hover:bg-coral-dark disabled:cursor-not-allowed disabled:bg-[#e8c7b8] disabled:text-white/80"
    >
      {pending ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
      ) : (
        <Check className="mr-2 h-4 w-4" aria-hidden />
      )}
      {pending ? copy.saving : copy.save}
    </button>
  );
}

export function ActivityCoverImageManager({
  activityId,
  className,
  compact = false,
  fallbackCoverImageUrl,
  initialCoverImageUrl,
  locale,
  triggerTone = "card",
}: ActivityCoverImageManagerProps) {
  const router = useRouter();
  const copy = getCoverManagerCopy(locale);
  const [open, setOpen] = useState(false);
  const [coverImageUrl, setCoverImageUrl] = useState(initialCoverImageUrl ?? "");
  const [isUploading, setIsUploading] = useState(false);
  const [state, formAction] = useActionState(
    updateActivityCoverImageAction,
    initialState,
  );

  useEffect(() => {
    setCoverImageUrl(initialCoverImageUrl ?? "");
  }, [initialCoverImageUrl]);

  useEffect(() => {
    if (!open || typeof window === "undefined") {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  useEffect(() => {
    if (!state.success) {
      return;
    }

    setCoverImageUrl(state.coverImageUrl ?? "");
    setOpen(false);
    router.refresh();
  }, [router, state.coverImageUrl, state.success]);

  return (
    <>
      <button
        type="button"
        className={cn(
          "inline-flex h-8 items-center justify-center gap-1.5 rounded-full border text-[11px] font-bold backdrop-blur transition hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-coral/55",
          triggerTone === "detail"
            ? "border-[#f0b79f] bg-[#d88d72] px-3 text-white shadow-[0_12px_30px_rgba(34,22,14,0.34)] ring-2 ring-white/80 hover:bg-[#c8795f]"
            : compact
              ? "w-8 border-[#4a2e1e]/30 bg-[#fffaf2] px-0 text-[#2b1a10] shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_12px_30px_rgba(0,0,0,0.36)] ring-2 ring-white/85 hover:bg-white min-[460px]:w-auto min-[460px]:px-2.5"
              : "border-[#f1c8b9] bg-[#fff7ed]/96 px-2.5 text-[#9a5139] shadow-[0_10px_24px_rgba(0,0,0,0.2)] hover:bg-white",
          className,
        )}
        aria-label={copy.trigger}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
        }}
      >
        <ImageUp
          className={cn(
            "h-3.5 w-3.5",
            compact && triggerTone !== "detail" ? "text-[#c45f42]" : null,
          )}
          aria-hidden
        />
        <span
          className={
            compact
              ? "sr-only min-[460px]:not-sr-only"
              : "max-[380px]:sr-only"
          }
        >
          {triggerTone === "detail" ? copy.trigger : copy.triggerShort}
        </span>
      </button>

      {open ? (
        <div
          className="fixed inset-x-0 top-0 bottom-[calc(5.15rem+env(safe-area-inset-bottom))] z-[80] flex items-end justify-center bg-black/42 px-3 pb-3 pt-4 backdrop-blur-[2px] md:inset-0 md:items-center md:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby={`cover-manager-title-${activityId}`}
        >
          <button
            type="button"
            className="absolute inset-0 cursor-default"
            aria-label={copy.close}
            onClick={() => setOpen(false)}
          />
          <div className="relative flex max-h-full w-full max-w-xl flex-col overflow-hidden rounded-[1.35rem] border border-[#decfb7] bg-[#fffaf2] p-4 shadow-[0_24px_70px_rgba(35,26,17,0.25)] sm:p-5">
            <div className="flex shrink-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <p
                  id={`cover-manager-title-${activityId}`}
                  className="text-lg font-semibold text-ink"
                >
                  {copy.title}
                </p>
                <p className="mt-1 text-sm leading-6 text-zinc-600">
                  {copy.description}
                </p>
              </div>
              <button
                type="button"
                className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#dfceb0] bg-white text-[#6b5b4a] shadow-sm transition hover:bg-[#fff7ed]"
                aria-label={copy.close}
                onClick={() => setOpen(false)}
              >
                <X className="h-4 w-4" aria-hidden />
              </button>
            </div>

            <form
              action={formAction}
              className="mt-4 grid min-h-0 gap-4 overflow-y-auto pr-1"
              noValidate
            >
              <input name="activityId" type="hidden" value={activityId} />
              <input name="locale" type="hidden" value={locale} />
              <ActivityCoverUpload
                fallbackPreviewUrl={fallbackCoverImageUrl}
                initialUrl={coverImageUrl}
                locale={locale}
                onChange={setCoverImageUrl}
                onUploadingChange={setIsUploading}
              />

              {state.formError ? (
                <p className="rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-sm font-medium text-red-700">
                  {state.formError}
                </p>
              ) : null}

              <div className="sticky bottom-0 flex flex-col gap-2 border-t border-[#e7d8c4] bg-[#fffaf2]/96 pt-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between">
                <button
                  type="button"
                  className="inline-flex h-10 items-center justify-center rounded-full border border-[#dfceb0] bg-white/90 px-4 text-sm font-semibold text-[#7b6b56] transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-55"
                  disabled={!coverImageUrl || isUploading}
                  onClick={() => setCoverImageUrl("")}
                >
                  <RotateCcw className="mr-2 h-4 w-4" aria-hidden />
                  {copy.remove}
                </button>
                <CoverManagerSubmitButton
                  disabled={isUploading}
                  locale={locale}
                />
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
