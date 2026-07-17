"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

type MessageImagePreviewGridProps = {
  imageLabel: string;
  imageUrls: string[];
};

export function MessageImagePreviewGrid({
  imageLabel,
  imageUrls,
}: MessageImagePreviewGridProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const didSwipeRef = useRef(false);
  const touchStartXRef = useRef<number | null>(null);
  const activeImageUrl =
    activeIndex === null ? null : (imageUrls[activeIndex] ?? null);
  const hasMultipleImages = imageUrls.length > 1;

  useEffect(() => {
    if (activeIndex === null) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setActiveIndex(null);
        return;
      }

      if (event.key === "ArrowLeft") {
        setActiveIndex((current) =>
          current === null
            ? current
            : (current - 1 + imageUrls.length) % imageUrls.length,
        );
        return;
      }

      if (event.key === "ArrowRight") {
        setActiveIndex((current) =>
          current === null ? current : (current + 1) % imageUrls.length,
        );
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeIndex, imageUrls.length]);

  function showPreviousImage() {
    setActiveIndex((current) =>
      current === null
        ? current
        : (current - 1 + imageUrls.length) % imageUrls.length,
    );
  }

  function showNextImage() {
    setActiveIndex((current) =>
      current === null ? current : (current + 1) % imageUrls.length,
    );
  }

  return (
    <>
      <div
        className={cn(
          "grid gap-1.5",
          imageUrls.length === 1 ? "grid-cols-1" : "grid-cols-2",
        )}
      >
        {imageUrls.map((imageUrl, index) => (
          <button
            key={imageUrl}
            type="button"
            className={cn(
              "block overflow-hidden rounded-xl bg-black/5 text-left outline-none ring-0 transition duration-200 hover:brightness-[0.96] focus-visible:ring-2 focus-visible:ring-white/80",
              imageUrls.length === 1 ? "h-44 w-56 max-w-[62vw]" : "h-24 w-24",
            )}
            aria-label={`${imageLabel} ${index + 1}`}
            onClick={() => setActiveIndex(index)}
          >
            {/* Uploaded message images can come from public storage domains outside next/image config. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt=""
              className="h-full w-full object-cover"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      {activeImageUrl ? (
        <div
          className="fixed inset-0 z-[100] flex min-h-dvh flex-col bg-black/92 text-white backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-label={imageLabel}
          onClick={() => setActiveIndex(null)}
        >
          <div className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/78 to-transparent" />
          <div className="relative z-10 flex items-center justify-between px-4 pb-2 pt-[calc(0.9rem+env(safe-area-inset-top))] sm:px-6">
            <div className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tabular-nums text-white/88 ring-1 ring-white/15">
              {(activeIndex ?? 0) + 1} / {imageUrls.length}
            </div>
            <button
              type="button"
              className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/12 text-white ring-1 ring-white/20 transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              aria-label="Close"
              onClick={(event) => {
                event.stopPropagation();
                setActiveIndex(null);
              }}
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="relative z-0 flex min-h-0 flex-1 items-center justify-center px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-10">
            {hasMultipleImages ? (
              <button
                type="button"
                className="absolute left-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/12 text-white ring-1 ring-white/20 transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white sm:inline-flex"
                aria-label="Previous image"
                onClick={(event) => {
                  event.stopPropagation();
                  showPreviousImage();
                }}
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
            ) : null}

            <button
              type="button"
              className="flex h-full w-full items-center justify-center"
              aria-label="Close preview"
              onTouchStart={(event) => {
                touchStartXRef.current = event.touches[0]?.clientX ?? null;
              }}
              onTouchEnd={(event) => {
                if (!hasMultipleImages || touchStartXRef.current === null) {
                  touchStartXRef.current = null;
                  return;
                }

                const deltaX =
                  (event.changedTouches[0]?.clientX ?? touchStartXRef.current) -
                  touchStartXRef.current;

                touchStartXRef.current = null;

                if (Math.abs(deltaX) < 44) {
                  didSwipeRef.current = false;
                  return;
                }

                didSwipeRef.current = true;

                if (deltaX > 0) {
                  showPreviousImage();
                  return;
                }

                showNextImage();
              }}
              onClick={() => {
                if (didSwipeRef.current) {
                  didSwipeRef.current = false;
                  return;
                }

                setActiveIndex(null);
              }}
            >
              {/* Uploaded message images can come from public storage domains outside next/image config. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeImageUrl}
                alt=""
                className="max-h-[calc(100dvh-8.5rem)] max-w-full rounded-[1.15rem] object-contain shadow-[0_24px_80px_rgba(0,0,0,0.5)]"
              />
            </button>

            {hasMultipleImages ? (
              <button
                type="button"
                className="absolute right-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/12 text-white ring-1 ring-white/20 transition hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white sm:inline-flex"
                aria-label="Next image"
                onClick={(event) => {
                  event.stopPropagation();
                  showNextImage();
                }}
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            ) : null}
          </div>

          {hasMultipleImages ? (
            <div
              className="relative z-10 flex justify-center gap-1.5 pb-[calc(0.85rem+env(safe-area-inset-bottom))]"
              onClick={(event) => event.stopPropagation()}
            >
              {imageUrls.map((imageUrl, index) => (
                <button
                  key={imageUrl}
                  type="button"
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    index === activeIndex
                      ? "w-6 bg-white"
                      : "w-1.5 bg-white/36 hover:bg-white/64",
                  )}
                  aria-label={`${imageLabel} ${index + 1}`}
                  onClick={() => setActiveIndex(index)}
                />
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
