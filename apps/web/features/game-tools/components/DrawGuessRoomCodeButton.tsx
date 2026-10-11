"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

const COPY = {
  "zh-CN": { copy: "复制房间号", copied: "房间号已复制", manual: "选择房间号复制", close: "完成" },
  en: { copy: "Copy room code", copied: "Room code copied", manual: "Select the code to copy", close: "Done" },
  fr: { copy: "Copier le code", copied: "Code copié", manual: "Sélectionnez le code à copier", close: "Terminé" },
};

function copyWithSelection(code: string) {
  const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const field = document.createElement("textarea");
  field.value = code;
  field.readOnly = true;
  field.style.cssText = "position:fixed;top:0;left:-9999px;font-size:16px;";
  document.body.appendChild(field);
  field.select();
  field.setSelectionRange(0, code.length);
  try {
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    field.remove();
    previousFocus?.focus({ preventScroll: true });
  }
}

export function DrawGuessRoomCodeButton({ code, locale, compact = false, className }: {
  code: string;
  locale: string;
  compact?: boolean;
  className?: string;
}) {
  const copy = COPY[locale as keyof typeof COPY] ?? COPY.en;
  const [copied, setCopied] = useState(false);
  const [manualCopy, setManualCopy] = useState(false);
  const copying = useRef(false);
  const mounted = useRef(true);
  const feedbackTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const codeField = useRef<HTMLInputElement>(null);
  const dialogTitleId = useId();

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      if (feedbackTimer.current !== null) clearTimeout(feedbackTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!manualCopy) return;
    dialog.current?.showModal();
    codeField.current?.focus();
    codeField.current?.select();
  }, [manualCopy]);

  async function copyCode() {
    if (copying.current) return;
    copying.current = true;
    let succeeded = false;
    try {
      if (navigator.clipboard?.writeText) {
        try {
          await navigator.clipboard.writeText(code);
          succeeded = true;
        } catch { /* Try selection-based copying before asking for manual copying. */ }
      }
      if (!mounted.current) return;
      if (!succeeded) succeeded = copyWithSelection(code);
      if (succeeded) {
        setCopied(true);
        if (feedbackTimer.current !== null) clearTimeout(feedbackTimer.current);
        feedbackTimer.current = setTimeout(() => setCopied(false), 2_000);
      } else {
        setManualCopy(true);
      }
    } finally {
      copying.current = false;
    }
  }

  return <>
    <button
      type="button"
      aria-label={`${copied ? copy.copied : copy.copy}: ${code}`}
      title={`${copy.copy}: ${code}`}
      onClick={() => void copyCode()}
      className={cn("draw-guess-btn draw-guess-btn--milk min-h-11 min-w-11 shrink-0 whitespace-nowrap text-sm", compact ? "gap-1.5 px-2.5" : "gap-2 px-3", className)}
    >
      <span className="font-mono font-bold tracking-wide">{code}</span>
      {copied ? <Check aria-hidden="true" className="h-3.5 w-3.5 shrink-0" /> : <Copy aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />}
    </button>
    <span role="status" className="sr-only">{copied ? `${copy.copied}: ${code}` : ""}</span>
    <dialog
      ref={dialog}
      aria-labelledby={dialogTitleId}
      onClose={() => setManualCopy(false)}
      onClick={(event) => { if (event.target === event.currentTarget) dialog.current?.close(); }}
      onKeyDown={(event) => {
        if (event.key !== "Tab") return;
        const first = codeField.current;
        const last = event.currentTarget.querySelector("button");
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }}
      className="draw-guess-theme m-auto w-[calc(100%_-_2rem)] max-w-xs rounded-3xl border-0 bg-[var(--dg-paper)] p-5 text-[var(--dg-ink)] shadow-xl backdrop:bg-ink/45"
    >
      <div>
        <h2 id={dialogTitleId} className="text-center text-base font-bold">{copy.manual}</h2>
        <input
          ref={codeField}
          aria-label={copy.copy}
          readOnly
          value={code}
          onFocus={(event) => event.currentTarget.select()}
          className="my-4 min-h-12 w-full select-text rounded-xl border border-[var(--dg-mist)] bg-white px-3 text-center font-mono text-xl font-bold tracking-widest focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--dg-sky)]"
        />
        <button type="button" onClick={() => dialog.current?.close()} className="draw-guess-btn draw-guess-btn--milk min-h-11 w-full px-4 text-sm">{copy.close}</button>
      </div>
    </dialog>
  </>;
}
