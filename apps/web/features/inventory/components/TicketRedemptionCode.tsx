"use client";

import QRCode from "qrcode";
import { Check, Copy, LoaderCircle, QrCode, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { generateTicketRedemptionTokenAction } from "@/features/inventory/actions/ticketRedemptionActions";
import { getTicketRedemptionCopy } from "@/features/inventory/ticketRedemptionCopy";
import { withLocale } from "@/lib/routes";

type ReadyCode = {
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
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
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

  async function generate() {
    setPending(true);
    setError("");
    setQrUrl("");
    setCode(null);
    try {
      const result = await generateTicketRedemptionTokenAction(itemId, locale);
      if (result.status === "READY") {
        setCode({ expiresAt: String(result.expiresAt), token: result.token });
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
  }

  async function copyLink() {
    if (!code || !active) return;
    try {
      await navigator.clipboard.writeText(
        new URL(
          withLocale(locale, `/tickets/redeem/${code.token}`),
          window.location.origin,
        ).toString(),
      );
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError(copy.unavailable);
    }
  }

  return (
    <section className="rounded-[1.35rem] bg-white p-5 ring-1 ring-[#D6D5B2] sm:p-6">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#EAF5E8] text-[#156240]">
          <QrCode aria-hidden="true" className="h-5 w-5" />
        </span>
        <div>
          <h2 className="font-bold text-[#111210]">{copy.generate}</h2>
          <p className="mt-0.5 text-sm text-[#667065]">{copy.generatedHint}</p>
        </div>
      </div>

      {active ? (
        <div className="mt-5 grid justify-items-center gap-3">
          <div className="grid aspect-square w-full max-w-[16rem] place-items-center rounded-xl bg-white p-2 ring-1 ring-[#D6D5B2]">
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
          <p className="text-sm font-semibold tabular-nums text-[#526457]">
            {Math.floor(expiresIn / 60)}:
            {String(expiresIn % 60).padStart(2, "0")}
          </p>
          <button
            className="inline-flex min-h-11 items-center gap-2 rounded-full px-4 text-sm font-bold text-[#156240] ring-1 ring-[#C9D6C6] active:scale-[0.98]"
            onClick={copyLink}
            type="button"
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? copy.copied : copy.copy}
          </button>
        </div>
      ) : code ? (
        <p className="mt-5 rounded-xl bg-[#FFF2E6] px-4 py-3 text-sm text-[#8F5522]">
          {copy.expired}
        </p>
      ) : null}

      {error ? (
        <p className="mt-4 text-sm font-semibold text-[#A62834]" role="alert">
          {error}
        </p>
      ) : null}
      <button
        className="mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#156240] px-5 text-sm font-bold text-white disabled:opacity-50 active:scale-[0.99]"
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
