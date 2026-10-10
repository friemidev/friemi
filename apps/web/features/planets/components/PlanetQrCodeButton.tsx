"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Copy, LoaderCircle, QrCode, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";

function getCopy(locale: string) {
  if (locale === "fr")
    return {
      title: "QR code de la planète",
      close: "Fermer",
      copy: "Copier le lien",
      copied: "Lien copié",
      failed: "Impossible de générer le QR code.",
      retry: "Réessayer",
      loading: "Chargement du QR code",
      manual: "Lien d'invitation",
    };
  if (locale === "en")
    return {
      title: "Planet QR code",
      close: "Close",
      copy: "Copy link",
      copied: "Link copied",
      failed: "Could not generate the QR code.",
      retry: "Try again",
      loading: "Loading QR code",
      manual: "Invite link",
    };
  return {
    title: "星球二维码",
    close: "关闭",
    copy: "复制邀请链接",
    copied: "已复制",
    failed: "二维码生成失败",
    retry: "重试",
    loading: "正在生成二维码",
    manual: "邀请链接",
  };
}

function PlanetQrDialog({
  inviteUrl,
  locale,
  planetName,
  onClose,
}: {
  inviteUrl: string;
  locale: string;
  planetName: string;
  onClose: () => void;
}) {
  const copy = getCopy(locale);
  const titleId = useId();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [copied, setCopied] = useState(false);
  const [manualCopy, setManualCopy] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    const previousOverflow = document.body.style.overflow;
    dialog?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      dialog?.close();
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    setQr(null);
    import("qrcode")
      .then(({ default: QRCode }) =>
        QRCode.toDataURL(inviteUrl, {
          margin: 4,
          width: 480,
          errorCorrectionLevel: "M",
        }),
      )
      .then((data) => {
        if (!cancelled) setQr(data);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [inviteUrl, attempt]);

  async function copyLink() {
    try {
      if (window.FriemiAndroid?.copyText)
        window.FriemiAndroid.copyText(inviteUrl);
      else await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
    } catch {
      setManualCopy(true);
    }
  }

  return createPortal(
    <dialog
      aria-labelledby={titleId}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-sm overflow-y-auto overscroll-contain rounded-lg bg-white p-0 text-ink shadow-xl backdrop:bg-ink/40"
      onCancel={onClose}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          onClose();
      }}
      ref={dialogRef}
    >
      <header className="flex items-center justify-between gap-2 border-b border-sand px-4 py-2">
        <h2 className="text-base font-bold" id={titleId}>
          {copy.title}
        </h2>
        <button
          aria-label={copy.close}
          autoFocus
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink/70 active:bg-fog"
          onClick={onClose}
          type="button"
        >
          <X aria-hidden="true" className="h-5 w-5" />
        </button>
      </header>
      <div className="px-5 pb-5 pt-4 text-center">
        <p className="break-words text-lg font-bold">{planetName}</p>
        <div className="mx-auto my-3 flex aspect-square w-full max-w-64 items-center justify-center bg-white">
          {qr ? (
            <img
              alt={`${copy.title}: ${planetName}`}
              className="h-full w-full object-contain"
              height={480}
              src={qr}
              width={480}
            />
          ) : failed ? (
            <div role="alert">
              <p className="text-sm text-danger">{copy.failed}</p>
              <button
                className="mt-2 inline-flex min-h-11 items-center gap-2 px-3 text-sm font-bold text-forest"
                onClick={() => setAttempt((value) => value + 1)}
                type="button"
              >
                <RefreshCw aria-hidden="true" className="h-4 w-4" />
                {copy.retry}
              </button>
            </div>
          ) : (
            <LoaderCircle
              aria-label={copy.loading}
              className="h-6 w-6 animate-spin text-forest motion-reduce:animate-none"
              role="status"
            />
          )}
        </div>
        <button
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-sand px-5 text-sm font-bold text-forest active:bg-fog"
          onClick={copyLink}
          type="button"
        >
          <Copy aria-hidden="true" className="h-4 w-4" />
          <span aria-live="polite">{copied ? copy.copied : copy.copy}</span>
        </button>
        {manualCopy ? (
          <input
            aria-label={copy.manual}
            autoFocus
            className="mt-3 min-h-11 w-full rounded border border-sand px-3 text-base"
            onFocus={(event) => event.currentTarget.select()}
            readOnly
            value={inviteUrl}
          />
        ) : null}
      </div>
    </dialog>,
    document.body,
  );
}

export function PlanetQrCodeButton({
  inviteUrl,
  locale,
  planetName,
  variant = "icon",
}: {
  inviteUrl: string;
  locale: string;
  planetName: string;
  variant?: "icon" | "row";
}) {
  const [open, setOpen] = useState(false);
  const copy = getCopy(locale);
  return (
    <>
      <button
        aria-haspopup="dialog"
        aria-label={copy.title}
        className={cn(
          "inline-flex min-h-11 items-center gap-3 text-forest transition active:bg-fog focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-meadow",
          variant === "icon"
            ? "w-11 justify-center rounded-full border border-sand"
            : "w-full border-b border-sand px-4 text-left text-sm font-bold",
        )}
        onClick={() => setOpen(true)}
        title={copy.title}
        type="button"
      >
        <QrCode aria-hidden="true" className="h-5 w-5 shrink-0" />
        {variant === "row" ? copy.title : null}
      </button>
      {open ? (
        <PlanetQrDialog
          inviteUrl={inviteUrl}
          locale={locale}
          onClose={() => setOpen(false)}
          planetName={planetName}
        />
      ) : null}
    </>
  );
}
