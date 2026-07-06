"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import QRCode from "qrcode";

type AvalonQrCodeProps = {
  label: string;
  value: string;
};

export function AvalonQrCode({ label, value }: AvalonQrCodeProps) {
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    QRCode.toDataURL(value, {
      color: {
        dark: "#156240",
        light: "#FEFFF9",
      },
      errorCorrectionLevel: "M",
      margin: 1,
      width: 220,
    })
      .then((url) => {
        if (mounted) {
          setDataUrl(url);
        }
      })
      .catch(() => {
        if (mounted) {
          setDataUrl("");
        }
      });

    return () => {
      mounted = false;
    };
  }, [value]);

  return (
    <div className="relative overflow-hidden rounded-[1.65rem] border border-[#D6D5B2] bg-[#FEFFF9] p-3 text-center shadow-inner">
      <div className="absolute -right-10 -top-10 h-24 w-24 rounded-full bg-[#8AB68E]/20 blur-2xl" />
      <div className="relative mb-2 flex items-center justify-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#F1F2EC] shadow-inner">
          <Image
            alt=""
            className="h-6 w-6 object-contain"
            height={28}
            src="/game-tools/avalon/states/scan-join-token.svg"
            width={28}
          />
        </span>
        <p className="text-xs font-black text-[#156240]">{label}</p>
      </div>
      <div className="relative mx-auto grid aspect-square max-w-[12.5rem] place-items-center rounded-[1.3rem] border border-[#8AB68E]/35 bg-white p-2 shadow-sm">
        {dataUrl ? (
          <Image
            alt={label}
            className="h-full w-full rounded-[1rem]"
            height={220}
            src={dataUrl}
            unoptimized
            width={220}
          />
        ) : (
          <div className="h-full w-full animate-pulse rounded-[1rem] bg-[#F1F2EC]" />
        )}
      </div>
    </div>
  );
}
