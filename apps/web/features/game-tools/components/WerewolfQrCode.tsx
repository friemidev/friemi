"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { werewolfUiAssets } from "@/features/game-tools/werewolfCardAssets";

type WerewolfQrCodeProps = {
  label: string;
  value: string;
};

export function WerewolfQrCode({ label, value }: WerewolfQrCodeProps) {
  const [dataUrl, setDataUrl] = useState("");

  useEffect(() => {
    let mounted = true;

    QRCode.toDataURL(value, {
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
    <div className="relative overflow-hidden rounded-[1.35rem] border border-[#D9C7B4] bg-[#FFFDF7] p-3 text-center shadow-inner">
      <div className="relative mb-2 flex items-center justify-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-[#F4ECE6] text-sm font-black text-[#7A1F2B]">
          QR
        </span>
        <p className="text-xs font-black text-[#7A1F2B]">{label}</p>
      </div>
      <div className="relative mx-auto grid aspect-square max-w-[12.5rem] place-items-center rounded-[1.1rem] border border-[#D9C7B4] bg-white p-3 shadow-sm">
        <img
          alt=""
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 h-full w-full"
          draggable={false}
          src={werewolfUiAssets.qrCornerFrame}
        />
        {dataUrl ? (
          <Image
            alt={label}
            className="h-full w-full rounded-[0.9rem]"
            height={220}
            src={dataUrl}
            unoptimized
            width={220}
          />
        ) : (
          <div className="h-full w-full animate-pulse rounded-[0.9rem] bg-[#F4ECE6]" />
        )}
      </div>
    </div>
  );
}
