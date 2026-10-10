"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCw } from "lucide-react";
import { bookingUpdatedMessage } from "@/features/merchants/bookings/bookingUpdates";
import {
  detailSheetCloseMessage,
  detailSheetReadyMessage,
  detailSheetVisibilityMessage,
} from "../detailSheetRetention";

export function getDetailFrameCopy(locale: string) {
  if (locale === "fr")
    return {
      close: "Fermer",
      loading: "Chargement de la sortie…",
      slow: "Le chargement prend plus de temps que prévu.",
      retry: "Réessayer",
    };
  if (locale === "en")
    return {
      close: "Close",
      loading: "Loading plan…",
      slow: "Loading is taking longer than expected.",
      retry: "Try again",
    };
  return {
    close: "关闭",
    loading: "正在加载聚吧…",
    slow: "加载时间较长，请重试。",
    retry: "重试",
  };
}

export function ActivityDetailFrame({
  href,
  label,
  locale,
  open,
  onNavigate,
  onBookingUpdated,
  onCloseRequested,
  copyOverride,
}: {
  href: string;
  label: string;
  locale: string;
  open: boolean;
  onNavigate: () => void;
  onBookingUpdated?: () => void;
  onCloseRequested?: () => void;
  copyOverride?: ReturnType<typeof getDetailFrameCopy>;
}) {
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<"loading" | "ready" | "slow">("loading");
  const copy = copyOverride ?? getDetailFrameCopy(locale);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (
        event.origin === window.location.origin &&
        event.source === frameRef.current?.contentWindow
      ) {
        if (event.data?.type === detailSheetReadyMessage) {
          setStatus("ready");
        } else if (event.data?.type === bookingUpdatedMessage) {
          onBookingUpdated?.();
        } else if (event.data?.type === detailSheetCloseMessage) {
          onCloseRequested?.();
        }
      }
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [onBookingUpdated, onCloseRequested]);

  useEffect(() => {
    if (status !== "loading" || !open) return;
    const timer = window.setTimeout(() => setStatus("slow"), 12_000);
    return () => window.clearTimeout(timer);
  }, [attempt, open, status]);

  useEffect(() => {
    frameRef.current?.contentWindow?.postMessage(
      { type: detailSheetVisibilityMessage, visible: open },
      window.location.origin,
    );
  }, [open, status]);

  return (
    <div
      className="relative h-full w-full bg-white"
      aria-busy={status === "loading"}
    >
      <iframe
        key={attempt}
        ref={frameRef}
        className="h-full w-full border-0 bg-white"
        title={label}
        aria-hidden={status !== "ready" || undefined}
        inert={status !== "ready"}
        src={href}
        loading="eager"
        onError={() => setStatus("slow")}
        onLoad={(event) => {
          const frame = event.currentTarget.contentWindow;
          try {
            if (!frame || frame.location.href === "about:blank") return;
            if (
              frame.location.href !== new URL(href, window.location.origin).href
            ) {
              onNavigate();
              setStatus("ready");
            } else if (frame.document.querySelector("h1, [role=alert]")) {
              setStatus("ready");
            }
          } catch {
            onNavigate();
            // Chromium's failed iframe document also becomes cross-origin.
            // Do not mistake it for a successfully loaded initial preview.
            setStatus((current) => (current === "ready" ? "ready" : "slow"));
          }
          frame?.postMessage(
            { type: detailSheetVisibilityMessage, visible: open },
            window.location.origin,
          );
        }}
      />
      {status !== "ready" ? (
        <div className="absolute inset-0 overflow-auto bg-white px-5 py-4">
          <h2 className="text-xl font-bold text-ink">{label}</h2>
          <p className="mt-3 text-sm text-ink/60" role="status">
            {status === "slow" ? copy.slow : copy.loading}
          </p>
          {status === "slow" ? (
            <button
              className="friemi-pressable mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-forest px-5 text-sm font-semibold text-white"
              onClick={() => {
                setStatus("loading");
                setAttempt((value) => value + 1);
              }}
              type="button"
            >
              <RotateCw className="h-4 w-4" aria-hidden="true" />
              {copy.retry}
            </button>
          ) : (
            <div
              aria-hidden="true"
              className="friemi-delayed-loader mt-6 space-y-4"
            >
              <div className="aspect-[16/9] rounded-lg bg-fog" />
              <div className="h-4 w-3/4 rounded bg-fog" />
              <div className="h-4 w-1/2 rounded bg-fog" />
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
