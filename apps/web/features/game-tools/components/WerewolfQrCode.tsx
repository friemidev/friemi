"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { Check, Copy } from "lucide-react";

type WerewolfQrCodeProps = {
  codeLabel: string;
  copiedLabel: string;
  copyLabel: string;
  label: string;
  qrValue?: string;
  roomCode: string;
  unavailableLabel: string;
  value: string;
};

export function WerewolfQrCode({
  codeLabel,
  copiedLabel,
  copyLabel,
  label,
  qrValue,
  roomCode,
  unavailableLabel,
  value,
}: WerewolfQrCodeProps) {
  const [copied, setCopied] = useState(false);
  const [dataUrl, setDataUrl] = useState("");
  const [hasQrError, setHasQrError] = useState(false);

  useEffect(() => {
    let mounted = true;

    setDataUrl("");
    setHasQrError(false);

    QRCode.toDataURL(qrValue ?? value, {
      color: {
        dark: "#7A1F2B",
        light: "#FFFDF7",
      },
      errorCorrectionLevel: "M",
      margin: 1,
      width: 220,
    })
      .then((url) => {
        if (mounted) {
          setDataUrl(url);
          setHasQrError(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setDataUrl("");
          setHasQrError(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, [qrValue, value]);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="relative text-center">
      <div className="relative mb-2 flex items-center justify-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#F4ECE6] text-sm font-bold text-[#7A1F2B]">
          QR
        </span>
        <p className="text-xs font-semibold text-[#7A1F2B]">{label}</p>
      </div>
      <div className="relative mx-auto grid aspect-square max-w-[12.5rem] place-items-center bg-white">
        {dataUrl ? (
          <Image
            alt={label}
            className="h-full w-full"
            height={220}
            src={dataUrl}
            unoptimized
            width={220}
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-[#F4ECE6] p-3">
            <p className="text-xs font-semibold leading-5 text-[#7A1F2B]">
              {hasQrError ? unavailableLabel : roomCode}
            </p>
          </div>
        )}
      </div>
      <div className="mt-3 grid gap-1 px-1 text-left">
        <p className="text-[11px] font-semibold text-[#7A1F2B]/62">
          {codeLabel}
        </p>
        <p className="text-lg font-bold tracking-[0.2em] text-[#7A1F2B] friemi-tabular">
          {roomCode}
        </p>
      </div>
      <button
        className="mt-2 inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-full border border-[#D9C7B4] bg-white px-3 text-xs font-semibold text-[#1E1718] transition hover:bg-[#FFF7F1]"
        onClick={handleCopy}
        type="button"
      >
        {copied ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
        {copied ? copiedLabel : copyLabel}
      </button>
    </div>
  );
}
