"use client";

import QRCode from "qrcode";
import { Copy, LoaderCircle } from "lucide-react";
import { useEffect, useState } from "react";

export function CouponQrCode({
  copyLabel,
  copiedLabel,
  path,
}: {
  copyLabel: string;
  copiedLabel: string;
  path: string;
}) {
  const [dataUrl, setDataUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [value, setValue] = useState("");

  useEffect(() => {
    const absoluteValue = new URL(path, window.location.origin).toString();
    setValue(absoluteValue);
    let active = true;

    QRCode.toDataURL(absoluteValue, {
      color: {
        dark: "#0F6D46",
        light: "#FFFFFF",
      },
      errorCorrectionLevel: "M",
      margin: 2,
      width: 420,
    })
      .then((nextDataUrl) => {
        if (active) setDataUrl(nextDataUrl);
      })
      .catch(() => {
        if (active) setDataUrl("");
      });

    return () => {
      active = false;
    };
  }, [path]);

  async function copyLink() {
    if (!value) return;
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="grid justify-items-center gap-3">
      <div className="grid aspect-square w-full max-w-[17rem] place-items-center overflow-hidden rounded-[1rem] bg-white p-3 ring-1 ring-[#D6D5B2]">
        {dataUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img alt="QR code" className="h-full w-full" src={dataUrl} />
        ) : (
          <LoaderCircle className="h-6 w-6 animate-spin text-[#156240]" />
        )}
      </div>
      <button
        className="inline-flex h-10 items-center justify-center gap-2 rounded-full bg-white px-4 text-xs font-black text-[#156240] ring-1 ring-[#BFD8B9] transition active:scale-95"
        onClick={copyLink}
        type="button"
      >
        <Copy className="h-4 w-4" />
        {copied ? copiedLabel : copyLabel}
      </button>
    </div>
  );
}
