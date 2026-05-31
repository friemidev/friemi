"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import {
  AlertCircle,
  CheckCircle2,
  CircleHelp,
  LinkIcon,
  Loader2,
  WandSparkles,
  X,
} from "lucide-react";
import { Button, Input } from "@chill-club/ui";
import type { ActivityCategory, PriceType } from "@chill-club/shared";
import { getActivityCoverDisplayUrl } from "@/lib/activity-cover-display";
import {
  getCategoryLabel,
  getCopy,
  getPriceTypeLabel,
} from "@/lib/copy";
import { activityLinkImportSites } from "@/lib/activity-link-import-sites";
import { withLocale } from "@/lib/routes";
import type { ActivityFormValues } from "@/features/activities/actions/activityActionUtils";
import type {
  ActivityLinkPreview,
  ActivityLinkPreviewValues,
} from "@/features/activity-link-import/parseActivityLink";

type ActivityLinkImportPanelProps = {
  locale: string;
  onApply: (values: Partial<ActivityFormValues>) => void;
};

const importFieldKeys = [
  "title",
  "startAt",
  "endAt",
  "address",
  "category",
  "capacity",
  "coverImageUrl",
  "description",
  "itinerary",
  "price",
] as const;

type ImportFieldKey = (typeof importFieldKeys)[number];

type FieldSelection = Record<ImportFieldKey, boolean>;

function getErrorMessage(locale: string, errorCode: string) {
  const t = getCopy(locale).form.linkImportErrors;

  return t[errorCode as keyof typeof t] ?? t.FETCH_FAILED;
}

function hasImportFieldValue(
  field: ImportFieldKey,
  values: ActivityLinkPreviewValues,
) {
  if (field === "description") {
    return Boolean(values.description);
  }

  if (field === "price") {
    return Boolean(values.priceText);
  }

  return Boolean(values[field]);
}

function buildDefaultFieldSelection(
  values: ActivityLinkPreviewValues,
): FieldSelection {
  return {
    title: Boolean(values.title),
    startAt: Boolean(values.startAt),
    endAt: Boolean(values.endAt),
    address: Boolean(values.address),
    category: Boolean(values.category),
    capacity: Boolean(values.capacity),
    coverImageUrl: Boolean(values.coverImageUrl),
    description: Boolean(values.description),
    itinerary: Boolean(values.itinerary),
    price: Boolean(values.priceText),
  };
}

function formatPreviewValue(
  field: ImportFieldKey,
  values: ActivityLinkPreviewValues,
  locale: string,
  missingLabel: string,
) {
  if (field === "description") {
    return values.description
      ? values.description.slice(0, 220) +
          (values.description.length > 220 ? "…" : "")
      : missingLabel;
  }

  if (field === "itinerary") {
    return values.itinerary
      ? values.itinerary.slice(0, 220) +
          (values.itinerary.length > 220 ? "…" : "")
      : missingLabel;
  }

  if (field === "price") {
    if (!values.priceText) {
      return missingLabel;
    }

    const priceTypeLabel = values.priceType
      ? getPriceTypeLabel(values.priceType as PriceType, locale)
      : "";

    return priceTypeLabel
      ? `${priceTypeLabel} · ${values.priceText}`
      : values.priceText;
  }

  if (field === "category" && values.category) {
    return getCategoryLabel(values.category as ActivityCategory, locale);
  }

  const value = values[field];

  if (!value) {
    return missingLabel;
  }

  if (field === "coverImageUrl") {
    return value;
  }

  return String(value);
}

function PreviewFieldRow({
  checked,
  disabled = false,
  label,
  onCheckedChange,
  value,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onCheckedChange?: (checked: boolean) => void;
  value: ReactNode;
}) {
  return (
    <div className="grid grid-cols-[auto_5.5rem_minmax(0,1fr)] items-start gap-x-3 gap-y-1 border-b border-zinc-100 py-2.5 last:border-b-0 sm:grid-cols-[auto_6.5rem_minmax(0,1fr)]">
      <input
        checked={checked}
        className="mt-0.5 h-4 w-4 rounded border-zinc-300 text-moss focus:ring-moss/30 disabled:opacity-60"
        disabled={disabled}
        onChange={(event) => onCheckedChange?.(event.target.checked)}
        type="checkbox"
      />
      <span className="text-xs font-medium leading-5 text-zinc-600">{label}</span>
      <div className="min-w-0 text-sm leading-5 text-ink">{value}</div>
    </div>
  );
}

export function ActivityLinkImportPanel({
  locale,
  onApply,
}: ActivityLinkImportPanelProps) {
  const t = getCopy(locale).form;
  const supportedSites = activityLinkImportSites;
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [isApplied, setIsApplied] = useState(false);
  const [isSitesDialogOpen, setIsSitesDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [preview, setPreview] = useState<ActivityLinkPreview | null>(null);
  const [selectedFields, setSelectedFields] = useState<FieldSelection>(() =>
    buildDefaultFieldSelection({}),
  );
  const canSubmit = url.trim().length > 0 && !isLoading;

  const fieldLabels = useMemo(
    () => ({
      title: t.title,
      startAt: t.startAt,
      endAt: t.endAt,
      address: t.address,
      category: t.category,
      capacity: t.capacity,
      coverImageUrl: t.coverImage,
      description: t.description,
      itinerary: t.itinerary,
      price: t.priceText,
    }),
    [t],
  );

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
      setSelectedFields(buildDefaultFieldSelection(payload.preview.values));
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

    const payload: Partial<ActivityFormValues> = {};

    for (const field of importFieldKeys) {
      if (!selectedFields[field] || !hasImportFieldValue(field, preview.values)) {
        continue;
      }

      if (field === "description" && preview.values.description) {
        payload.description = preview.values.description;
        continue;
      }

      if (field === "itinerary" && preview.values.itinerary) {
        payload.itinerary = preview.values.itinerary;
        continue;
      }

      if (field === "price") {
        if (preview.values.priceText) {
          payload.priceText = preview.values.priceText;
        }

        if (preview.values.priceType) {
          payload.priceType = preview.values.priceType;
        }

        continue;
      }

      if (field === "category" && preview.values.category) {
        payload.category = preview.values.category;
        continue;
      }

      const value = preview.values[field];

      if (value !== undefined && value !== "") {
        payload[field] = String(value);
      }
    }

    if (selectedFields.address) {
      if (preview.values.city) {
        payload.city = preview.values.city;
      }

      if (preview.values.latitude) {
        payload.latitude = preview.values.latitude;
      }

      if (preview.values.longitude) {
        payload.longitude = preview.values.longitude;
      }
    }

    payload.importSourceUrl = preview.sourceUrl;

    onApply(payload);
    setIsApplied(true);
  }

  function handleUrlKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    void previewLink();
  }

  function toggleField(field: ImportFieldKey, checked: boolean) {
    setSelectedFields((current) => ({
      ...current,
      [field]: checked,
    }));
    setIsApplied(false);
  }

  return (
    <section className="rounded-lg border border-black/10 bg-paper/70 p-3 sm:p-4">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-moss ring-1 ring-black/10">
          <LinkIcon className="h-4 w-4" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <p className="text-sm font-semibold text-ink">{t.linkImportTitle}</p>
            <button
              aria-label={t.linkImportSupportedSitesAriaLabel}
              className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white hover:text-moss"
              onClick={() => setIsSitesDialogOpen(true)}
              type="button"
            >
              <CircleHelp className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-1 text-xs leading-5 text-zinc-500">
            {t.linkImportDescription}
          </p>
        </div>
      </div>

      {isSitesDialogOpen ? (
        <div
          aria-labelledby="link-import-sites-title"
          aria-modal="true"
          className="fixed inset-0 z-[70] flex items-end justify-center bg-black/35 p-0 sm:items-center sm:p-6"
          role="dialog"
        >
          <div className="max-h-[85vh] w-full overflow-y-auto rounded-t-2xl border border-black/10 bg-paper p-5 shadow-2xl sm:max-w-lg sm:rounded-2xl">
            <div className="flex items-start justify-between gap-3">
              <h2
                className="text-lg font-semibold text-ink"
                id="link-import-sites-title"
              >
                {t.linkImportSupportedSitesTitle}
              </h2>
              <button
                aria-label={t.linkImportSupportedSitesClose}
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-zinc-500 transition hover:bg-white hover:text-ink"
                onClick={() => setIsSitesDialogOpen(false)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <ul className="mt-4 grid gap-3">
              {supportedSites.map((site) => (
                <li
                  className="rounded-md border border-zinc-200 bg-white px-3 py-2.5"
                  key={site.host}
                >
                  <p className="text-sm font-semibold text-ink">{site.name}</p>
                  <p className="mt-0.5 text-xs text-zinc-500">{site.host}</p>
                  <p className="mt-1 break-all font-mono text-[11px] leading-5 text-moss">
                    {site.exampleUrl}
                  </p>
                </li>
              ))}
            </ul>
            <Button
              className="mt-4 w-full"
              onClick={() => setIsSitesDialogOpen(false)}
              type="button"
              variant="secondary"
            >
              {t.linkImportSupportedSitesClose}
            </Button>
          </div>
        </div>
      ) : null}

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
      <p className="text-[11px] leading-5 text-zinc-500">
        {t.linkImportSupportedSiteExamples}
      </p>

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

          {preview.duplicateHint ? (
            <div
              className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-900"
              role="status"
            >
              <p>
                {preview.duplicateHint.status === "same_url"
                  ? t.linkImportDuplicateSameUrl(preview.duplicateHint.title)
                  : t.linkImportDuplicateSimilar(preview.duplicateHint.title)}
              </p>
              <Link
                className="mt-1 inline-block font-medium underline"
                href={withLocale(
                  locale,
                  `/activities/${preview.duplicateHint.activityId}`,
                )}
                rel="noreferrer"
                target="_blank"
              >
                {t.linkImportViewExisting}
              </Link>
            </div>
          ) : null}

          <p className="mt-3 text-xs font-semibold text-zinc-700">
            {t.linkImportSelectFields}
          </p>

          <div className="mt-1 rounded-md border border-zinc-100 bg-zinc-50/60 px-2">
            {importFieldKeys.map((field) => {
              const hasValue = hasImportFieldValue(field, preview.values);
              const displayValue = formatPreviewValue(
                field,
                preview.values,
                locale,
                t.linkImportFieldNotDetected,
              );

              return (
                <PreviewFieldRow
                  checked={selectedFields[field] && hasValue}
                  disabled={!hasValue}
                  key={field}
                  label={fieldLabels[field]}
                  onCheckedChange={(checked) => toggleField(field, checked)}
                  value={
                    field === "coverImageUrl" && hasValue ? (
                      <img
                        alt=""
                        className="h-16 w-16 rounded-md border border-zinc-200 object-cover"
                        src={getActivityCoverDisplayUrl(displayValue)}
                      />
                    ) : (field === "description" || field === "itinerary") &&
                      hasValue ? (
                      <span className="whitespace-pre-wrap text-xs leading-5 text-zinc-700">
                        {displayValue}
                      </span>
                    ) : (
                      <span
                        className={
                          hasValue ? "text-ink" : "text-zinc-400 italic"
                        }
                      >
                        {displayValue}
                      </span>
                    )
                  }
                />
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
