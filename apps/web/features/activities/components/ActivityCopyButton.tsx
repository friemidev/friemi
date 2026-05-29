"use client";

import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

type ActivityCopyButtonProps = {
  className?: string;
  failedLabel: string;
  label: string;
  successLabel: string;
  value: string;
};

async function copyText(value: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = value;
  textArea.setAttribute("readonly", "");
  textArea.style.position = "fixed";
  textArea.style.left = "-9999px";
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  const didCopy = document.execCommand("copy");
  document.body.removeChild(textArea);

  if (!didCopy) {
    throw new Error("Copy command failed");
  }
}

export function ActivityCopyButton({
  className,
  failedLabel,
  label,
  successLabel,
  value,
}: ActivityCopyButtonProps) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");

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
    } catch {
      setState("failed");
    }
  }

  const title =
    state === "copied"
      ? successLabel
      : state === "failed"
        ? failedLabel
        : label;

  return (
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
      <span aria-live="polite" className="sr-only">
        {title}
      </span>
    </button>
  );
}
