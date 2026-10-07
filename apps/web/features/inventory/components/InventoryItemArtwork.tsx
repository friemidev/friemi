"use client";

import { useState } from "react";
import { Ticket } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export function InventoryItemArtwork({
  alt,
  className,
  imageUrl,
  fit = "cover",
}: {
  alt: string;
  className?: string;
  imageUrl: string;
  fit?: "contain" | "cover";
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);

  return (
    <div
      className={cn(
        "relative grid place-items-center overflow-hidden bg-fog text-forest",
        className,
      )}
    >
      {failedUrl === imageUrl ? (
        <Ticket aria-hidden="true" className="h-9 w-9" />
      ) : (
        <Image
          alt={alt}
          className={cn(
            "h-full w-full",
            fit === "contain" ? "object-contain" : "object-cover",
          )}
          fill
          loading="lazy"
          onError={() => setFailedUrl(imageUrl)}
          sizes="(max-width: 640px) calc(50vw - 2.5rem), 24rem"
          src={imageUrl}
          unoptimized
        />
      )}
    </div>
  );
}
