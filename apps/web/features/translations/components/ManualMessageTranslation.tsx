"use client";

import { useState } from "react";
import { getCopy } from "@/lib/copy";
import { cn } from "@/lib/utils";
import type { TranslationResult } from "../types";
import { TranslationIconButton } from "./TranslationIconButton";

type MessageEntityType =
  | "direct_message"
  | "activity_room_message"
  | "planet_message";

// No effect, prefetch or automatic cache lookup. Even a cached translation is
// requested and shown only after the viewer explicitly presses the button.
export function ManualMessageTranslation(props: {
  entityId: string;
  entityType: MessageEntityType;
  locale: string;
  text: string;
  align?: "start" | "end";
}) {
  // A realtime edit or locale change discards the previously displayed result.
  return (
    <MessageTranslationControl
      key={`${props.entityId}:${props.locale}:${props.text}`}
      {...props}
    />
  );
}

function MessageTranslationControl({
  entityId,
  entityType,
  locale,
  align = "start",
}: {
  entityId: string;
  entityType: MessageEntityType;
  locale: string;
  text: string;
  align?: "start" | "end";
}) {
  const t = getCopy(locale).translation;
  const [translation, setTranslation] = useState<TranslationResult | null>(
    null,
  );
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function translate() {
    if (translation) {
      setVisible((value) => !value);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/translations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityId,
          entityType,
          locale,
          field: entityType === "planet_message" ? "content" : "body",
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? "TRANSLATION_FAILED");
      setTranslation(payload as TranslationResult);
      setVisible(true);
    } catch (failure) {
      setError(
        failure instanceof Error ? failure.message : "TRANSLATION_FAILED",
      );
    } finally {
      setLoading(false);
    }
  }

  const paused =
    error === "TRANSLATION_FREE_QUOTA_EXHAUSTED" ||
    error === "TRANSLATION_DAILY_LIMIT";
  return (
    <div
      className={cn("min-w-0 max-w-full", align === "end" && "text-right")}
      data-message-translation
    >
      <TranslationIconButton
        loading={loading}
        active={visible}
        expanded={visible}
        label={
          loading
            ? t.translating
            : translation
              ? visible
                ? t.showOriginal
                : t.showTranslation
              : t.translate
        }
        onClick={() => void translate()}
      />
      <div aria-live="polite" className="text-left">
        {error ? (
          <p className="pb-2 text-xs text-danger">
            {paused ? t.quotaPaused : t.failed}
          </p>
        ) : null}
        {visible && translation ? (
          <div className="mb-2 border-l-2 border-meadow/40 pl-2 text-ink">
            <p className="mb-1 text-[11px] font-medium text-ink/70">
              {t.translatedBy}
            </p>
            <p className="whitespace-pre-wrap text-sm leading-6 [overflow-wrap:anywhere]">
              {translation.translatedText}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
