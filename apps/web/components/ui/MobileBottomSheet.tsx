"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type TouchEvent,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type MobileBottomSheetProps = {
  ariaLabel: string;
  bodyClassName?: string;
  children: ReactNode;
  className?: string;
  closeLabel?: string;
  heightClassName?: string;
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
  heightClassName = "h-[85svh]",
  onClose,
  open,
  zIndexClassName = "z-[70]",
}: MobileBottomSheetProps) {
  const closeTimeoutRef = useRef<number | null>(null);
  const [isClosing, setIsClosing] = useState(false);
  const [mounted, setMounted] = useState(false);
  const touchStartYRef = useRef<number | null>(null);

  const requestClose = useCallback(() => {
    if (isClosing || closeTimeoutRef.current !== null) {
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

  useEffect(() => {
    if (open) {
      setIsClosing(false);
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current !== null) {
        window.clearTimeout(closeTimeoutRef.current);
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

  function handleSheetTouchStart(event: TouchEvent<HTMLDivElement>) {
    touchStartYRef.current = event.touches[0]?.clientY ?? null;
  }

  function handleSheetTouchEnd(event: TouchEvent<HTMLDivElement>) {
    const startY = touchStartYRef.current;
    touchStartYRef.current = null;

    if (startY === null) {
      return;
    }

    const endY = event.changedTouches[0]?.clientY ?? startY;

    if (endY - startY > 48) {
      requestClose();
    }
  }

  if (!open || !mounted) {
    return null;
  }

  return createPortal(
    <div
      className={cn(
        "fixed inset-0 flex items-end bg-[#111210]/42 pt-[15svh]",
        isClosing
          ? "animate-[mobile-bottom-sheet-overlay-out_160ms_ease-in_forwards]"
          : null,
        zIndexClassName,
      )}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          requestClose();
        }
      }}
      role="presentation"
    >
      <section
        aria-label={ariaLabel}
        aria-modal="true"
        className={cn(
          "flex w-full min-w-0 flex-col overflow-hidden rounded-t-[1.35rem] bg-white shadow-[0_-18px_54px_rgba(17,18,16,0.22)] motion-reduce:animate-none",
          isClosing
            ? "animate-[activity-room-sheet-out_160ms_ease-in_forwards]"
            : "animate-[activity-room-sheet-in_180ms_ease-out]",
          heightClassName,
          className,
        )}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div
          className="shrink-0 bg-white px-4 pb-1 pt-2"
          onTouchEnd={handleSheetTouchEnd}
          onTouchStart={handleSheetTouchStart}
        >
          <button
            aria-label={closeLabel ?? ariaLabel}
            className="mx-auto flex h-6 w-20 items-center justify-center rounded-full transition active:scale-95"
            onClick={requestClose}
            type="button"
          >
            <span className="h-1.5 w-12 rounded-full bg-[#D6D5B2]" />
          </button>
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
