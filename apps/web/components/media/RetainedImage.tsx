"use client";

import {
  useEffect,
  useState,
  type ImgHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

const retainedImageLimit = 160;
const retainedImages = new Map<string, HTMLImageElement>();
const decodedImageSources = new Set<string>();

function retainImage(source: string, referrerPolicy?: ReferrerPolicy) {
  if (typeof window === "undefined" || retainedImages.has(source)) {
    return;
  }

  const image = new window.Image();
  image.decoding = "async";
  image.referrerPolicy = referrerPolicy ?? "no-referrer";
  retainedImages.set(source, image);

  image.addEventListener(
    "load",
    () => {
      void image
        .decode()
        .catch(() => undefined)
        .finally(() => decodedImageSources.add(source));
    },
    { once: true },
  );
  image.src = source;

  if (retainedImages.size <= retainedImageLimit) {
    return;
  }

  const oldestSource = retainedImages.keys().next().value;

  if (typeof oldestSource === "string" && oldestSource !== source) {
    retainedImages.delete(oldestSource);
    decodedImageSources.delete(oldestSource);
  }
}

export function retainImageSources(
  sources: Array<string | null | undefined>,
  limit = 4,
) {
  let retainedCount = 0;

  for (const source of new Set(sources)) {
    const normalizedSource = source?.trim();

    if (!normalizedSource) {
      continue;
    }

    retainImage(normalizedSource, "no-referrer");
    retainedCount += 1;

    if (retainedCount >= limit) {
      break;
    }
  }
}

type RetainedImageProps = Omit<
  ImgHTMLAttributes<HTMLImageElement>,
  "alt" | "onError" | "onLoad" | "src"
> & {
  alt: string;
  onReadyChange?: (ready: boolean) => void;
  src: string;
};

export function RetainedImage({
  alt,
  className,
  decoding = "async",
  onReadyChange,
  referrerPolicy = "no-referrer",
  src,
  ...props
}: RetainedImageProps) {
  const [readySource, setReadySource] = useState<string | null>(() =>
    decodedImageSources.has(src) ? src : null,
  );
  const isReady = readySource === src;

  useEffect(() => {
    if (decodedImageSources.has(src)) {
      setReadySource(src);
      onReadyChange?.(true);
      return;
    }

    setReadySource(null);
    onReadyChange?.(false);
    retainImage(src, referrerPolicy);
  }, [onReadyChange, referrerPolicy, src]);

  return (
    // Uploaded images may be hosted outside the Next.js image allowlist.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      {...props}
      alt={alt}
      className={cn(
        "transition-none",
        isReady ? "opacity-100" : "opacity-0",
        className,
      )}
      decoding={decoding}
      onError={() => {
        decodedImageSources.delete(src);
        retainedImages.delete(src);
        setReadySource(null);
        onReadyChange?.(false);
      }}
      onLoad={(event) => {
        const image = event.currentTarget;

        void image
          .decode()
          .catch(() => undefined)
          .finally(() => {
            decodedImageSources.add(src);
            retainImage(src, referrerPolicy);
            setReadySource(src);
            onReadyChange?.(true);
          });
      }}
      referrerPolicy={referrerPolicy}
      src={src}
    />
  );
}
