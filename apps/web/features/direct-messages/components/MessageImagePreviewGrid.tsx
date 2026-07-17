"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type WheelEvent as ReactWheelEvent,
} from "react";
import {
  ChevronLeft,
  ChevronRight,
  Minus,
  Plus,
  RotateCcw,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

type MessageImagePreviewGridProps = {
  imageLabel: string;
  imageUrls: string[];
  resetLabel: string;
};

export function MessageImagePreviewGrid({
  imageLabel,
  imageUrls,
  resetLabel,
}: MessageImagePreviewGridProps) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [previewTransform, setPreviewTransform] = useState({
    scale: 1,
    x: 0,
    y: 0,
  });
  const [isPanning, setIsPanning] = useState(false);
  const gestureRef = useRef<
    | {
        kind: "pan";
        originX: number;
        originY: number;
        startX: number;
        startY: number;
      }
    | {
        kind: "pinch";
        startDistance: number;
        startScale: number;
      }
    | {
        kind: "swipe";
        startX: number;
        startY: number;
      }
    | null
  >(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const activeImageUrl =
    activeIndex === null ? null : (imageUrls[activeIndex] ?? null);
  const hasMultipleImages = imageUrls.length > 1;
  const isZoomed = previewTransform.scale > 1.01;

  function clampScale(scale: number) {
    return Math.min(5, Math.max(1, scale));
  }

  function clampOffset(x: number, y: number, scale: number) {
    if (scale <= 1.01 || typeof window === "undefined") {
      return {
        x: 0,
        y: 0,
      };
    }

    const maxX = window.innerWidth * (scale - 1) * 0.58;
    const maxY = window.innerHeight * (scale - 1) * 0.58;

    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y)),
    };
  }

  function resetPreviewTransform() {
    setPreviewTransform({
      scale: 1,
      x: 0,
      y: 0,
    });
    setIsPanning(false);
    gestureRef.current = null;
    pointersRef.current.clear();
  }

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

  useEffect(() => {
    resetPreviewTransform();
  }, [activeImageUrl]);

  function showPreviousImage() {
    resetPreviewTransform();
    setActiveIndex((current) =>
      current === null
        ? current
        : (current - 1 + imageUrls.length) % imageUrls.length,
    );
  }

  function showNextImage() {
    resetPreviewTransform();
    setActiveIndex((current) =>
      current === null ? current : (current + 1) % imageUrls.length,
    );
  }

  function getPointerDistance() {
    const pointers = Array.from(pointersRef.current.values());

    if (pointers.length < 2) {
      return null;
    }

    const [firstPointer, secondPointer] = pointers;
    const deltaX = secondPointer.x - firstPointer.x;
    const deltaY = secondPointer.y - firstPointer.y;

    return Math.hypot(deltaX, deltaY);
  }

  function zoomAroundPoint(
    nextScaleInput: number,
    clientX: number,
    clientY: number,
    target: HTMLElement,
  ) {
    setPreviewTransform((current) => {
      const nextScale = clampScale(nextScaleInput);

      if (nextScale <= 1.01) {
        return {
          scale: 1,
          x: 0,
          y: 0,
        };
      }

      const bounds = target.getBoundingClientRect();
      const pointerX = clientX - bounds.left - bounds.width / 2;
      const pointerY = clientY - bounds.top - bounds.height / 2;
      const ratio = nextScale / current.scale;
      const nextOffset = clampOffset(
        pointerX - (pointerX - current.x) * ratio,
        pointerY - (pointerY - current.y) * ratio,
        nextScale,
      );

      return {
        scale: nextScale,
        x: nextOffset.x,
        y: nextOffset.y,
      };
    });
  }

  function zoomFromCenter(nextScaleInput: number) {
    setPreviewTransform((current) => {
      const nextScale = clampScale(nextScaleInput);

      if (nextScale <= 1.01) {
        return {
          scale: 1,
          x: 0,
          y: 0,
        };
      }

      const ratio = nextScale / current.scale;
      const nextOffset = clampOffset(
        current.x * ratio,
        current.y * ratio,
        nextScale,
      );

      return {
        scale: nextScale,
        x: nextOffset.x,
        y: nextOffset.y,
      };
    });
  }

  function handlePreviewWheel(event: ReactWheelEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();

    const direction = event.deltaY < 0 ? 1 : -1;
    const nextScale =
      previewTransform.scale +
      direction * Math.max(0.18, previewTransform.scale * 0.14);

    zoomAroundPoint(nextScale, event.clientX, event.clientY, event.currentTarget);
  }

  function handlePreviewDoubleClick(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    event.stopPropagation();

    if (previewTransform.scale > 1.01) {
      resetPreviewTransform();
      return;
    }

    zoomAroundPoint(2.4, event.clientX, event.clientY, event.currentTarget);
  }

  function handlePreviewPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    if (pointersRef.current.size >= 2) {
      const distance = getPointerDistance();

      if (distance) {
        gestureRef.current = {
          kind: "pinch",
          startDistance: distance,
          startScale: previewTransform.scale,
        };
      }

      return;
    }

    if (isZoomed) {
      setIsPanning(true);
      gestureRef.current = {
        kind: "pan",
        originX: previewTransform.x,
        originY: previewTransform.y,
        startX: event.clientX,
        startY: event.clientY,
      };
      return;
    }

    gestureRef.current = {
      kind: "swipe",
      startX: event.clientX,
      startY: event.clientY,
    };
  }

  function handlePreviewPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!pointersRef.current.has(event.pointerId)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    pointersRef.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });

    const gesture = gestureRef.current;

    if (!gesture) {
      return;
    }

    if (gesture.kind === "pinch") {
      const distance = getPointerDistance();

      if (!distance || gesture.startDistance <= 0) {
        return;
      }

      const nextScale = clampScale(
        gesture.startScale * (distance / gesture.startDistance),
      );

      setPreviewTransform((current) => ({
        scale: nextScale,
        ...clampOffset(current.x, current.y, nextScale),
      }));
      return;
    }

    if (gesture.kind === "pan") {
      const nextOffset = clampOffset(
        gesture.originX + event.clientX - gesture.startX,
        gesture.originY + event.clientY - gesture.startY,
        previewTransform.scale,
      );

      setPreviewTransform({
        scale: previewTransform.scale,
        x: nextOffset.x,
        y: nextOffset.y,
      });
    }
  }

  function handlePreviewPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    event.stopPropagation();

    const gesture = gestureRef.current;
    const pointer = pointersRef.current.get(event.pointerId);
    pointersRef.current.delete(event.pointerId);
    setIsPanning(false);

    if (
      gesture?.kind === "swipe" &&
      hasMultipleImages &&
      pointer &&
      !isZoomed
    ) {
      const deltaX = event.clientX - gesture.startX;
      const deltaY = event.clientY - gesture.startY;

      if (Math.abs(deltaX) > 48 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
        if (deltaX > 0) {
          showPreviousImage();
        } else {
          showNextImage();
        }
      }
    }

    if (pointersRef.current.size === 0) {
      gestureRef.current = null;
    }
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
          <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/92 via-black/58 to-transparent" />
          <div
            className="relative z-10 flex items-center justify-between gap-3 px-3 pb-2 pt-[calc(0.9rem+env(safe-area-inset-top))] sm:px-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex min-w-0 items-center gap-2">
              <button
                type="button"
                className="inline-flex h-10 items-center gap-1.5 rounded-full bg-[#151515]/85 px-3 text-xs font-semibold text-white shadow-[0_10px_30px_rgba(0,0,0,0.5)] ring-1 ring-white/35 backdrop-blur-md transition hover:bg-black focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label={resetLabel}
                onClick={resetPreviewTransform}
              >
                <RotateCcw className="h-3.5 w-3.5" />
                <span>{resetLabel}</span>
              </button>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-[#151515]/70 p-1 shadow-[0_10px_30px_rgba(0,0,0,0.45)] ring-1 ring-white/28 backdrop-blur-md">
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/16 text-white transition hover:bg-white/24 focus:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-45"
                aria-label="Zoom out"
                disabled={previewTransform.scale <= 1.01}
                onClick={() => zoomFromCenter(previewTransform.scale - 0.65)}
              >
                <Minus className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/16 text-white transition hover:bg-white/24 focus:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-45"
                aria-label="Zoom in"
                disabled={previewTransform.scale >= 4.95}
                onClick={() => zoomFromCenter(previewTransform.scale + 0.75)}
              >
                <Plus className="h-4 w-4" />
              </button>
              <button
                type="button"
                className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white text-black shadow-[0_0_24px_rgba(255,255,255,0.32)] transition hover:bg-white/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                aria-label="Close"
                onClick={() => setActiveIndex(null)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div
            className="relative z-0 flex min-h-0 flex-1 items-center justify-center px-3 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-10"
            onClick={(event) => {
              if (event.target === event.currentTarget) {
                setActiveIndex(null);
              }
            }}
          >
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

            <div
              className={cn(
                "flex h-full w-full touch-none select-none items-center justify-center overflow-hidden",
                isZoomed
                  ? isPanning
                    ? "cursor-grabbing"
                    : "cursor-grab"
                  : "cursor-zoom-in",
              )}
              role="presentation"
              onClick={(event) => event.stopPropagation()}
              onDoubleClick={handlePreviewDoubleClick}
              onPointerCancel={handlePreviewPointerUp}
              onPointerDown={handlePreviewPointerDown}
              onPointerMove={handlePreviewPointerMove}
              onPointerUp={handlePreviewPointerUp}
              onWheel={handlePreviewWheel}
            >
              {/* Uploaded message images can come from public storage domains outside next/image config. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={activeImageUrl}
                alt=""
                className={cn(
                  "max-h-[calc(100dvh-8.5rem)] max-w-[calc(100vw-1.25rem)] rounded-[1.15rem] object-contain shadow-[0_24px_80px_rgba(0,0,0,0.5)] will-change-transform",
                  isPanning
                    ? "transition-none"
                    : "transition-transform duration-150",
                )}
                draggable={false}
                style={{
                  transform: `translate3d(${previewTransform.x}px, ${previewTransform.y}px, 0) scale(${previewTransform.scale})`,
                }}
              />
            </div>

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
