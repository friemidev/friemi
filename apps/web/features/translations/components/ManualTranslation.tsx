"use client";

import { useMemo, useState } from "react";
import { Bot, Languages, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getCopy } from "@/lib/copy";
import type {
  TranslationEntityType,
  TranslationResult,
} from "@/features/translations/types";

type TranslationFieldItem = {
  field: string;
  label: string;
  text: string | null | undefined;
};

type TranslationStatus = "idle" | "loading" | "translated" | "error";

async function requestTranslation({
  accessToken,
  entityId,
  entityType,
  field,
  locale,
}: {
  accessToken?: string | null;
  entityId: string;
  entityType: TranslationEntityType;
  field: string;
  locale: string;
}) {
  const response = await fetch("/api/translations", {
    body: JSON.stringify({
      accessToken,
      entityId,
      entityType,
      field,
      locale,
    }),
    headers: {
      "Content-Type": "application/json",
    },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("TRANSLATION_FAILED");
  }

  return (await response.json()) as TranslationResult;
}

export function ManualTranslationBundle({
  accessToken,
  className,
  entityId,
  entityType,
  fields,
  locale,
}: {
  accessToken?: string | null;
  className?: string;
  entityId: string;
  entityType: Exclude<TranslationEntityType, "comment">;
  fields: TranslationFieldItem[];
  locale: string;
}) {
  const t = getCopy(locale).translation;
  const sourceFields = useMemo(
    () => fields.filter((field) => field.text?.trim()),
    [fields],
  );
  const [status, setStatus] = useState<TranslationStatus>("idle");
  const [showOriginal, setShowOriginal] = useState(false);
  const [translations, setTranslations] = useState<
    Record<string, TranslationResult>
  >({});

  if (sourceFields.length === 0) {
    return null;
  }

  const hasTranslations = Object.keys(translations).length > 0;

  async function translateFields() {
    setStatus("loading");
    setShowOriginal(false);

    try {
      const translatedFields = await Promise.all(
        sourceFields.map((field) =>
          requestTranslation({
            accessToken,
            entityId,
            entityType,
            field: field.field,
            locale,
          }),
        ),
      );
      const nextTranslations = translatedFields.reduce<
        Record<string, TranslationResult>
      >((result, translation) => {
        result[translation.field] = translation;
        return result;
      }, {});

      setTranslations(nextTranslations);
      setStatus("translated");
    } catch {
      setStatus("error");
    }
  }

  return (
    <div className={cn("mt-3", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-[#bfd6b7] bg-white px-3 text-xs font-semibold text-[#315b48] shadow-sm transition hover:bg-[#f7fff3] disabled:cursor-wait disabled:opacity-70"
          disabled={status === "loading"}
          onClick={translateFields}
        >
          {status === "loading" ? (
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Languages className="h-3.5 w-3.5" />
          )}
          {status === "loading" ? t.translating : t.translateMainInfo}
        </button>
        {hasTranslations ? (
          <button
            type="button"
            className="inline-flex h-8 items-center rounded-full bg-zinc-100 px-3 text-xs font-medium text-zinc-600 transition hover:bg-zinc-200"
            onClick={() => setShowOriginal((value) => !value)}
          >
            {showOriginal ? t.showTranslation : t.showOriginal}
          </button>
        ) : null}
      </div>

      {status === "error" ? (
        <p className="mt-2 text-xs font-medium text-red-600">
          {t.failed}
        </p>
      ) : null}

      {hasTranslations ? (
        <div className="mt-3 rounded-xl border border-[#cfe2c6] bg-[#fffaf2] p-3">
          <div className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[#006e4d]">
            <Bot className="h-3.5 w-3.5" />
            {t.translatedBy}
          </div>
          <div className="space-y-3">
            {sourceFields.map((field) => {
              const translation = translations[field.field];
              const displayText = showOriginal
                ? field.text?.trim()
                : translation?.translatedText;

              if (!displayText) {
                return null;
              }

              return (
                <div key={field.field} className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-500">
                    {field.label}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap text-sm leading-7 text-zinc-700">
                    {displayText}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ManualTranslationText({
  accessToken,
  className,
  entityId,
  locale,
  text,
}: {
  accessToken?: string | null;
  className?: string;
  entityId: string;
  locale: string;
  text: string;
}) {
  const t = getCopy(locale).translation;
  const [status, setStatus] = useState<TranslationStatus>("idle");
  const [translation, setTranslation] = useState<TranslationResult | null>(null);
  const [showOriginal, setShowOriginal] = useState(true);

  async function translateComment() {
    if (translation) {
      setShowOriginal(false);
      return;
    }

    setStatus("loading");

    try {
      const result = await requestTranslation({
        accessToken,
        entityId,
        entityType: "comment",
        field: "content",
        locale,
      });

      setTranslation(result);
      setShowOriginal(false);
      setStatus("translated");
    } catch {
      setStatus("error");
    }
  }

  const displayText =
    translation && !showOriginal ? translation.translatedText : text;

  return (
    <div>
      <p className={className}>{displayText}</p>
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium">
        {translation ? (
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-600 transition hover:bg-zinc-200"
            onClick={() => setShowOriginal((value) => !value)}
          >
            <Bot className="h-3.5 w-3.5" aria-hidden="true" />
            {showOriginal ? t.showTranslation : t.showOriginal}
          </button>
        ) : (
          <button
            type="button"
            className="inline-flex items-center gap-1 rounded-full bg-zinc-100 px-2.5 py-1 text-zinc-600 transition hover:bg-zinc-200 disabled:cursor-wait disabled:opacity-70"
            disabled={status === "loading"}
            onClick={translateComment}
          >
            {status === "loading" ? (
              <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Bot className="h-3.5 w-3.5" aria-hidden="true" />
            )}
            {status === "loading" ? t.translating : t.translate}
          </button>
        )}
        {status === "error" ? (
          <span className="text-red-600">{t.failed}</span>
        ) : null}
      </div>
    </div>
  );
}
