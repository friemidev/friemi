"use client";

import { useEffect, useState } from "react";
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
    return null;
  }

  return (
    <>
      {/* Public cover URLs can come from Supabase Storage or Paris OpenData. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 h-full w-full object-cover"
        decoding="async"
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setHasFailed(true)}
      />
      <div className={cn("absolute inset-0", overlayClassName)} aria-hidden />
    </>
  );
}
