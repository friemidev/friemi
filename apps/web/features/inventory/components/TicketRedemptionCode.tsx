"use client";

import QRCode from "qrcode";
import { Check, Copy, LoaderCircle, QrCode, RefreshCw } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { generateTicketRedemptionTokenAction } from "@/features/inventory/actions/ticketRedemptionActions";
import { getTicketRedemptionCopy } from "@/features/inventory/ticketRedemptionCopy";
import { withLocale } from "@/lib/routes";

type ReadyCode = {
  code: string;
  expiresAt: string;
  token: string;
};

export function TicketRedemptionCode({
  itemId,
  locale,
}: {
  itemId: string;
  locale: string;
}) {
  const copy = getTicketRedemptionCopy(locale);
  const [code, setCode] = useState<ReadyCode | null>(null);
  const [qrUrl, setQrUrl] = useState("");
  const [now, setNow] = useState(0);
  const [pending, setPending] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const requestedItemRef = useRef<string | null>(null);
  const expiresIn = code
    ? Math.max(0, Math.ceil((new Date(code.expiresAt).getTime() - now) / 1000))
    : 0;
  const active = Boolean(code && expiresIn > 0);

  useEffect(() => {
    if (!code) return;
    const interval = window.setInterval(() => setNow(Date.now()), 1000);
    setNow(Date.now());
    return () => window.clearInterval(interval);
  }, [code]);

  useEffect(() => {
    if (!code) return;
    let live = true;
    const path = withLocale(locale, `/tickets/redeem/${code.token}`);
    void QRCode.toDataURL(new URL(path, window.location.origin).toString(), {
      color: { dark: "#133D2C", light: "#FFFFFF" },
      errorCorrectionLevel: "M",
      margin: 2,
      width: 420,
    })
      .then((url) => {
        if (live) setQrUrl(url);
      })
      .catch(() => {
        if (live) {
          setCode(null);
          setError(copy.unavailable);
        }
      });
    return () => {
      live = false;
    };
  }, [code, copy.unavailable, locale]);

  const generate = useCallback(async () => {
    setPending(true);
    setError("");
    setQrUrl("");
    setCode(null);
    setCopied(false);
    try {
      const result = await generateTicketRedemptionTokenAction(itemId, locale);
      if (result.status === "READY") {
        setCode({
          code: result.code,
          expiresAt: result.expiresAt,
          token: result.token,
        });
      } else {
        setError(
          result.status === "ALREADY_REDEEMED"
            ? copy.alreadyRedeemed
            : copy.unavailable,
        );
      }
    } catch {
      setError(copy.unavailable);
    } finally {
      setPending(false);
    }
  }, [copy.alreadyRedeemed, copy.unavailable, itemId, locale]);

  useEffect(() => {
    if (requestedItemRef.current === itemId) return;
    requestedItemRef.current = itemId;
    void generate();
  }, [generate, itemId]);

  async function copyCheckInCode() {
    if (!code || !active) return;
    try {
      await navigator.clipboard.writeText(code.code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError(copy.unavailable);
    }
  }

  return (
    <section className="rounded-[1.5rem] bg-white px-5 py-6 shadow-[0_12px_36px_rgba(20,62,42,0.07)] sm:px-6">
      <h2 className="text-lg font-bold text-ink">{copy.passTitle}</h2>
      <p className="mt-1 text-sm leading-6 text-ink/70">{copy.generatedHint}</p>

      {active ? (
        <div className="mt-5 grid justify-items-center">
          <div className="grid aspect-square w-full max-w-[15rem] place-items-center rounded-xl bg-white p-1">
            {qrUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={copy.showCode} className="w-full" src={qrUrl} />
            ) : (
              <LoaderCircle
                aria-label={copy.processing}
                className="h-6 w-6 animate-spin text-forest"
              />
            )}
          </div>
          <p className="mt-3 text-xs font-semibold text-ink/70">
            {copy.codeLabel}
          </p>
          <p className="mt-1 font-mono text-[1.75rem] font-bold tracking-[0.14em] text-forest tabular-nums sm:text-3xl">
            {code?.code.slice(0, 3)} {code?.code.slice(3)}
          </p>
          <button
            className="mt-2 inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-bold text-meadow active:scale-[0.98]"
            onClick={copyCheckInCode}
            type="button"
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? copy.copied : copy.copy}
          </button>
          <p className="mt-1 text-xs font-medium tabular-nums text-ink/70">
            {Math.floor(expiresIn / 60)}:
            {String(expiresIn % 60).padStart(2, "0")}
          </p>
        </div>
      ) : pending ? (
        <div className="mt-6 grid min-h-56 place-items-center" role="status">
          <LoaderCircle
            aria-label={copy.processing}
            className="h-7 w-7 animate-spin text-forest"
          />
        </div>
      ) : code ? (
        <p className="mt-5 rounded-xl bg-sand/20 px-4 py-3 text-sm text-ink/70">
          {copy.expired}
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 text-sm font-semibold text-danger" role="alert">
          {error}
        </p>
      ) : null}
      <button
        className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-fog px-5 text-sm font-bold text-forest disabled:opacity-50 active:scale-[0.99]"
        disabled={pending}
        onClick={generate}
        type="button"
      >
        {pending ? (
          <LoaderCircle aria-hidden="true" className="h-4 w-4 animate-spin" />
        ) : active || code ? (
          <RefreshCw aria-hidden="true" className="h-4 w-4" />
        ) : (
          <QrCode aria-hidden="true" className="h-4 w-4" />
        )}
        {active || code ? copy.refresh : copy.generate}
      </button>
    </section>
  );
}
