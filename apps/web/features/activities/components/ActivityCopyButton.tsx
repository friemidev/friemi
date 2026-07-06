"use client";

import { useEffect, useState } from "react";
import type { FocusEvent, ReactNode } from "react";
import { Check, Copy, X } from "lucide-react";
import type { AnalyticsEventInput } from "@/features/analytics/events";
import { trackClientAnalyticsEvent } from "@/features/analytics/client";
import { cn } from "@/lib/utils";

type ActivityCopyButtonProps = {
  analyticsEvent?: Omit<AnalyticsEventInput, "locale" | "route">;
  className?: string;
  failedLabel: string;
  label: string;
  successLabel: string;
  value: string;
  children?: ReactNode;
};

async function tryClipboardCopy(value: string) {
  if (!navigator.clipboard?.writeText) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

function tryTextareaCopy(value: string) {
  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.top = "0";
  textArea.style.left = "0";
  textArea.style.width = "1px";
  textArea.style.height = "1px";
  textArea.style.opacity = "0";
  textArea.style.pointerEvents = "none";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  textArea.setSelectionRange(0, value.length);

  let didCopy = false;

  try {
    didCopy = document.execCommand("copy");
  } catch {
    didCopy = false;
  }

  document.body.removeChild(textArea);
  return didCopy;
}

function tryAndroidCopy(value: string) {
  if (!window.FriemiAndroid?.copyText) {
    return false;
  }

  window.FriemiAndroid.copyText(value);
  return true;
}

async function copyText(value: string) {
  if (await tryClipboardCopy(value)) {
    return;
  }

  if (tryAndroidCopy(value)) {
    return;
  }

  if (!tryTextareaCopy(value)) {
    throw new Error("Copy command failed");
  }
}

export function ActivityCopyButton({
  analyticsEvent,
  className,
  failedLabel,
  label,
  successLabel,
  value,
  children,
}: ActivityCopyButtonProps) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  const [manualCopyOpen, setManualCopyOpen] = useState(false);

  useEffect(() => {
    if (state === "idle") {
      return;
    }

    const timeout = window.setTimeout(() => setState("idle"), 1800);
    return () => window.clearTimeout(timeout);
  }, [state]);

  async function handleCopy() {
    try {
      await copyText(value);
      setState("copied");
      if (analyticsEvent) {
        trackClientAnalyticsEvent(analyticsEvent);
      }
    } catch {
      setState("failed");
      setManualCopyOpen(true);
    }
  }

  function handleManualTextareaFocus(event: FocusEvent<HTMLTextAreaElement>) {
    event.currentTarget.select();
  }

  const title =
    state === "copied"
      ? successLabel
      : state === "failed"
        ? failedLabel
        : label;
  const visibleLabel = state === "copied" ? title : children;

  return (
    <>
      <button
        aria-label={title}
        className={cn(
          "inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-zinc-500 ring-1 ring-transparent transition hover:bg-zinc-100 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-moss",
          state === "copied" && "bg-emerald-50 text-emerald-700",
          state === "failed" && "bg-red-50 text-red-700",
          className,
        )}
        onClick={handleCopy}
        title={title}
        type="button"
      >
        {state === "copied" ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
        {children ? <span>{visibleLabel}</span> : null}
        <span aria-live="polite" className="sr-only">
          {title}
        </span>
      </button>

      {manualCopyOpen ? (
        <div
          className="fixed inset-0 z-[80] flex items-end bg-black/36 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:items-center sm:justify-center sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={failedLabel}
        >
          <button
            aria-label="Close"
            className="absolute inset-0 cursor-default"
            onClick={() => setManualCopyOpen(false)}
            type="button"
          />
          <div className="relative w-full max-w-md rounded-2xl border border-[#8AB68E] bg-[#FFF5E6] p-4 shadow-2xl">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">{label}</p>
                <p className="mt-1 text-xs leading-5 text-zinc-600">
                  {failedLabel}
                </p>
              </div>
              <button
                aria-label="Close"
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-zinc-500 ring-1 ring-[#8AB68E] transition hover:text-ink"
                onClick={() => setManualCopyOpen(false)}
                type="button"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <textarea
              autoFocus
              className="mt-3 max-h-44 min-h-24 w-full resize-none rounded-xl border border-[#8AB68E] bg-white p-3 text-sm leading-6 text-zinc-800 outline-none focus:ring-2 focus:ring-[#369758]/25"
              onFocus={handleManualTextareaFocus}
              readOnly
              value={value}
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
