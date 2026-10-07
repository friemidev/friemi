"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

const collapsedHeightRatio = 0.85;
const sheetSnapDistance = 48;
const sheetCloseDistance = 64;

type MobileBottomSheetProps = {
  ariaLabel: string;
  bodyClassName?: string;
  children: ReactNode;
  className?: string;
  closeLabel?: string;
  headerAction?: ReactNode;
  heightClassName?: string;
  initiallyExpanded?: boolean;
  keepMounted?: boolean;
  onClose: () => void;
  open: boolean;
  zIndexClassName?: string;
};

export function MobileBottomSheet({
  ariaLabel,
  bodyClassName,
  children,
  className,
  closeLabel,
  headerAction,
  heightClassName = "h-[85%]",
  initiallyExpanded = false,
  keepMounted = false,
  onClose,
  open,
  zIndexClassName = "z-[70]",
}: MobileBottomSheetProps) {
  const clickResetTimeoutRef = useRef<number | null>(null);
  const closeTimeoutRef = useRef<number | null>(null);
  const dragDeltaYRef = useRef(0);
  const dragPointerIdRef = useRef<number | null>(null);
  const dragStartYRef = useRef<number | null>(null);
  const dragViewportHeightRef = useRef(0);
  const suppressNextClickRef = useRef(false);
  const [dragDeltaY, setDragDeltaY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [isExpanded, setIsExpanded] = useState(initiallyExpanded);
  const [isClosing, setIsClosing] = useState(false);
  const [hasEntered, setHasEntered] = useState(false);
  const [mounted, setMounted] = useState(false);

  const requestClose = useCallback(() => {
    if (isClosing || closeTimeoutRef.current !== null) {
      return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      onClose();
      return;
    }

    setIsClosing(true);
    closeTimeoutRef.current = window.setTimeout(() => {
      closeTimeoutRef.current = null;
      onClose();
    }, 160);
  }, [isClosing, onClose]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (closeTimeoutRef.current !== null) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setDragDeltaY(0);
    setIsDragging(false);
    setIsExpanded(initiallyExpanded);
    setIsClosing(false);
    setHasEntered(false);
  }, [initiallyExpanded, open]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
      }

      if (clickResetTimeoutRef.current !== null) {
        window.clearTimeout(clickResetTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        requestClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, requestClose]);

  function handleDragStart(event: ReactPointerEvent<HTMLDivElement>) {
    if (!event.isPrimary || event.button !== 0 || isClosing) {
      return;
    }

    dragPointerIdRef.current = event.pointerId;
    setHasEntered(true);
    dragStartYRef.current = event.clientY;
    dragViewportHeightRef.current =
      window.visualViewport?.height ?? window.innerHeight;
    dragDeltaYRef.current = 0;
    setDragDeltaY(0);
    setIsDragging(true);
  }

  function handleDragMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (
      dragPointerIdRef.current !== event.pointerId ||
      dragStartYRef.current === null
    ) {
      return;
    }

    const nextDeltaY = event.clientY - dragStartYRef.current;
    // Capturing on pointerdown retargets an ordinary handle-button click to
    // this wrapper. Capture only once the gesture is actually a drag.
    if (Math.abs(nextDeltaY) > 8 && !event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    dragDeltaYRef.current = nextDeltaY;
    setDragDeltaY(nextDeltaY);
  }

  function resetDrag(event: ReactPointerEvent<HTMLDivElement>) {
    if (
      dragPointerIdRef.current === event.pointerId &&
      event.currentTarget.hasPointerCapture(event.pointerId)
    ) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    dragPointerIdRef.current = null;
    dragStartYRef.current = null;
    dragDeltaYRef.current = 0;
    setDragDeltaY(0);
    setIsDragging(false);
  }

  function handleDragEnd(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragPointerIdRef.current !== event.pointerId) {
      return;
    }

    const deltaY = dragDeltaYRef.current;

    if (Math.abs(deltaY) > 8) {
      suppressNextClickRef.current = true;

      if (clickResetTimeoutRef.current !== null) {
        window.clearTimeout(clickResetTimeoutRef.current);
      }

      clickResetTimeoutRef.current = window.setTimeout(() => {
        suppressNextClickRef.current = false;
        clickResetTimeoutRef.current = null;
      }, 0);
    }

    resetDrag(event);

    if (isExpanded) {
      if (deltaY > sheetCloseDistance) {
        requestClose();
        return;
      }

      if (deltaY > sheetSnapDistance) {
        setIsExpanded(false);
      }

      return;
    }

    if (deltaY < -sheetSnapDistance) {
      setIsExpanded(true);
      return;
    }

    if (deltaY > sheetCloseDistance) {
      requestClose();
    }
  }

  function handleDragCancel(event: ReactPointerEvent<HTMLDivElement>) {
    if (dragPointerIdRef.current !== event.pointerId) {
      return;
    }

    resetDrag(event);
  }

  let sheetStyle: CSSProperties | undefined;

  if (isDragging) {
    const viewportHeight = dragViewportHeightRef.current;
    const collapsedHeight = viewportHeight * collapsedHeightRatio;
    const expansionRange = viewportHeight - collapsedHeight;

    if (isExpanded) {
      const contraction = Math.min(Math.max(dragDeltaY, 0), expansionRange);

      sheetStyle = {
        height: `calc(100svh - ${contraction}px)`,
      };
    } else if (dragDeltaY < 0) {
      const expansion = Math.min(-dragDeltaY, expansionRange);

      sheetStyle = {
        height: `calc(85svh + ${expansion}px)`,
      };
    } else {
      sheetStyle = {
        transform: `translateY(${dragDeltaY}px)`,
      };
    }
  } else if (isExpanded) {
    sheetStyle = { height: "100%" };
  }

  if ((!open && !keepMounted) || !mounted) {
    return null;
  }

  return createPortal(
    <div
      data-friemi-modal-overlay={open ? "true" : undefined}
      aria-hidden={!open || undefined}
      inert={!open}
      className={cn(
        "friemi-sheet-overlay fixed inset-x-0 flex items-end bg-[#111210]/42",
        zIndexClassName,
      )}
      data-state={isClosing ? "closing" : "open"}
      style={{
        display: open ? undefined : "none",
        height: "var(--friemi-modal-viewport-height, 100dvh)",
        top: "var(--friemi-modal-viewport-offset-top, 0px)",
      }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          requestClose();
        }
      }}
      role="presentation"
    >
      <section
        aria-label={ariaLabel}
        aria-modal={open || undefined}
        className={cn(
          "friemi-sheet-panel flex w-full min-w-0 shrink-0 flex-col overflow-hidden rounded-t-[1.35rem] bg-white shadow-[0_-18px_54px_rgba(17,18,16,0.22)]",
          isExpanded ? "!rounded-none" : null,
          heightClassName,
          className,
        )}
        data-dragging={isDragging || undefined}
        data-entered={hasEntered || undefined}
        onAnimationEnd={(event) => {
          if (event.target === event.currentTarget && !isClosing) {
            setHasEntered(true);
          }
        }}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
        style={sheetStyle}
      >
        <div
          className={cn(
            "relative shrink-0 touch-none select-none bg-white px-4 pb-1 pt-2",
            isExpanded ? "pt-[calc(0.5rem_+_var(--app-top-safe-area))]" : null,
          )}
          onPointerCancel={handleDragCancel}
          onPointerDown={handleDragStart}
          onPointerMove={handleDragMove}
          onPointerUp={handleDragEnd}
        >
          <button
            aria-label={closeLabel ?? ariaLabel}
            className="relative z-20 mx-auto flex h-6 w-20 cursor-grab items-center justify-center rounded-full transition active:cursor-grabbing active:scale-95 after:absolute after:-bottom-4 after:-top-1 after:inset-x-0 after:content-['']"
            onClick={() => {
              if (suppressNextClickRef.current) {
                suppressNextClickRef.current = false;
                return;
              }

              requestClose();
            }}
            type="button"
          >
            <span className="h-1.5 w-12 rounded-full bg-[#D6D5B2]" />
          </button>
          {headerAction ? (
            <div
              className="absolute bottom-0.5 right-3 z-10"
              onPointerDown={(event) => event.stopPropagation()}
            >
              {headerAction}
            </div>
          ) : null}
        </div>
        <div
          className={cn(
            "min-h-0 flex-1 overflow-y-auto overscroll-contain",
            bodyClassName,
          )}
        >
          {children}
        </div>
      </section>
    </div>,
    document.body,
  );
}
