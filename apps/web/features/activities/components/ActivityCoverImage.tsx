"use client";

import { useEffect, useState } from "react";
import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";

type ActivityCoverImageProps = {
  alt?: string;
  overlayClassName?: string;
  src: string | null;
};

export function ActivityCoverImage({
  alt = "",
  overlayClassName = "bg-black/20",
  src,
}: ActivityCoverImageProps) {
  const [hasFailed, setHasFailed] = useState(false);

  useEffect(() => {
    setHasFailed(false);
  }, [src]);

  if (!src || hasFailed) {
    return (
      <div
        className="absolute inset-0 flex items-center justify-center overflow-hidden bg-[#f7fff3]"
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_28%_18%,rgba(4,157,115,0.16),transparent_34%),radial-gradient(circle_at_78%_84%,rgba(244,141,129,0.13),transparent_30%),linear-gradient(135deg,rgba(255,255,255,0.94),rgba(238,248,234,0.92))]" />
        <div className="absolute inset-x-8 top-1/2 h-px bg-[#cfe2c6]/80" />
        <div className="relative flex h-14 w-14 items-center justify-center rounded-2xl border border-[#bfd6b7] bg-white shadow-[0_16px_36px_rgba(10,63,49,0.12)] sm:h-16 sm:w-16">
          {/* Brand fallback stays on the stable public logo path. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={brand.logoIconPath}
            alt=""
            className="h-10 w-10 object-contain sm:h-12 sm:w-12"
            decoding="async"
            loading="lazy"
          />
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Public cover URLs can come from Supabase Storage or Paris OpenData. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover/card:scale-[1.035]"
        decoding="async"
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setHasFailed(true)}
      />
      <div className={cn("absolute inset-0", overlayClassName)} aria-hidden />
    </>
  );
}
