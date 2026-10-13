"use client";

import { useState, type ReactNode } from "react";
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
  enabled?: boolean;
  children: (displayText: string) => ReactNode;
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
  text,
  align = "start",
  enabled = true,
  children,
}: {
  entityId: string;
  entityType: MessageEntityType;
  locale: string;
  text: string;
  align?: "start" | "end";
  enabled?: boolean;
  children: (displayText: string) => ReactNode;
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
  const translated = enabled && visible && translation !== null;
  return (
    <div className="min-w-0 max-w-full" data-message-translation>
      <div
        className={cn(
          "flex min-w-0 max-w-full items-center gap-1",
          align === "end" && "flex-row-reverse",
        )}
      >
        {children(translated ? translation.translatedText : text)}
        {enabled ? (
          <TranslationIconButton
            loading={loading}
            active={translated}
            label={
              loading
                ? t.translating
                : translation
                  ? translated
                    ? t.showOriginal
                    : t.showTranslation
                  : t.translate
            }
            onClick={() => void translate()}
          />
        ) : null}
      </div>
      {enabled && error ? (
        <p role="status" className="mt-1 text-xs text-danger">
          {paused ? t.quotaPaused : t.failed}
        </p>
      ) : null}
    </div>
  );
}
