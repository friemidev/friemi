"use client";

import { useState } from "react";
import type { ComponentType, KeyboardEvent } from "react";
import {
  AlertCircle,
  CalendarClock,
  CheckCircle2,
  ImageIcon,
  LinkIcon,
  Loader2,
  MapPin,
  WandSparkles,
} from "lucide-react";
import { Button, Input } from "@chill-club/ui";
import { getCopy } from "@/lib/copy";
import type { ActivityFormValues } from "@/features/activities/actions/activityActionUtils";

type ActivityLinkPreview = {
  missingFields: string[];
  siteName: string;
  sourceUrl: string;
  values: Partial<ActivityFormValues>;
};

type ActivityLinkImportPanelProps = {
  locale: string;
  onApply: (values: Partial<ActivityFormValues>) => void;
};

type DetectedField = {
  isDetected: boolean;
  label: string;
  icon: ComponentType<{ className?: string }>;
};

function getErrorMessage(locale: string, errorCode: string) {
  const t = getCopy(locale).form.linkImportErrors;

  return t[errorCode as keyof typeof t] ?? t.FETCH_FAILED;
}

export function ActivityLinkImportPanel({
  locale,
  onApply,
}: ActivityLinkImportPanelProps) {
  const t = getCopy(locale).form;
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [isApplied, setIsApplied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<ActivityLinkPreview | null>(null);
  const canSubmit = url.trim().length > 0 && !isLoading;
  const detectedFields: DetectedField[] = preview
    ? [
        {
          icon: CheckCircle2,
          isDetected: Boolean(preview.values.title),
          label: t.title,
        },
        {
          icon: CalendarClock,
          isDetected: Boolean(preview.values.startAt),
          label: t.startAt,
        },
        {
          icon: MapPin,
          isDetected: Boolean(preview.values.address),
          label: t.address,
        },
        {
          icon: ImageIcon,
          isDetected: Boolean(preview.values.coverImageUrl),
          label: t.coverImage,
        },
      ]
    : [];

  function handleUrlChange(nextUrl: string) {
    setUrl(nextUrl);
    setIsApplied(false);
    setError("");
    setPreview(null);
  }

  async function previewLink() {
    const trimmedUrl = url.trim();

    if (!trimmedUrl || isLoading) {
      return;
    }

    setError("");
    setIsApplied(false);
    setPreview(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/activity-link-preview", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          locale,
          url: trimmedUrl,
        }),
      });
      const payload = (await response.json()) as {
        error?: string;
        preview?: ActivityLinkPreview;
      };

      if (!response.ok || !payload.preview) {
        throw new Error(payload.error ?? "FETCH_FAILED");
      }

      setPreview(payload.preview);
    } catch (caughtError) {
      const errorCode =
        caughtError instanceof Error ? caughtError.message : "FETCH_FAILED";

      setError(getErrorMessage(locale, errorCode));
    } finally {
      setIsLoading(false);
    }
  }

  function applyPreview() {
    if (!preview) {
      return;
    }

    onApply(preview.values);
    setIsApplied(true);
  }

  function handleUrlKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    void previewLink();
  }

  return (
    <section className="rounded-lg border border-black/10 bg-paper/70 p-3 sm:p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-moss ring-1 ring-black/10">
          <LinkIcon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink">{t.linkImportTitle}</p>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            {t.linkImportDescription}
          </p>
        </div>
      </div>

      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <Input
          className="min-w-0 flex-1"
          onChange={(event) => handleUrlChange(event.target.value)}
          onKeyDown={handleUrlKeyDown}
          placeholder={t.linkImportPlaceholder}
          type="url"
          value={url}
        />
        <Button
          className="w-full gap-2 whitespace-nowrap sm:w-auto"
          disabled={!canSubmit}
          onClick={previewLink}
          type="button"
          variant="secondary"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <WandSparkles className="h-4 w-4" />
          )}
          {isLoading ? t.linkImportParsing : t.linkImportPreview}
        </Button>
      </div>

      {error ? (
        <p
          className="mt-3 flex items-start gap-2 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs leading-5 text-red-700"
          role="alert"
        >
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </p>
      ) : null}

      {preview ? (
        <div className="mt-3 rounded-md border border-zinc-200 bg-white p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-moss">
                <CheckCircle2 className="h-4 w-4" />
                {preview.siteName}
              </p>
              <p className="mt-1 line-clamp-2 text-sm font-semibold text-ink">
                {preview.values.title || t.linkImportUntitled}
              </p>
              <p className="mt-1 truncate text-xs text-zinc-500">
                {preview.values.address || t.linkImportMissingAddress}
              </p>
            </div>
            <Button
              className="w-full whitespace-nowrap sm:w-auto"
              onClick={applyPreview}
              type="button"
            >
              {t.linkImportApply}
            </Button>
          </div>
          {preview.missingFields.length > 0 ? (
            <p className="mt-2 text-xs leading-5 text-zinc-500">
              {t.linkImportMissingFields(preview.missingFields.length)}
            </p>
          ) : null}
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {detectedFields.map((field) => {
              const Icon = field.icon;

              return (
                <span
                  className={
                    field.isDetected
                      ? "inline-flex min-h-8 items-center gap-1.5 rounded-md bg-moss/10 px-2 text-xs font-medium text-moss"
                      : "inline-flex min-h-8 items-center gap-1.5 rounded-md bg-zinc-100 px-2 text-xs font-medium text-zinc-500"
                  }
                  key={field.label}
                >
                  <Icon className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{field.label}</span>
                </span>
              );
            })}
          </div>
          {isApplied ? (
            <p
              className="mt-3 flex items-start gap-2 rounded-md bg-moss/10 px-3 py-2 text-xs leading-5 text-moss"
              role="status"
            >
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              {t.linkImportApplied}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
