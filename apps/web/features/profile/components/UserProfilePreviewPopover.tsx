"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type UserProfilePreviewPopoverProps = {
  avatarUrl: string | null;
  children: React.ReactNode;
  isGuest?: boolean;
  isAuthenticated?: boolean;
  locale: string;
  nickname: string;
  profileId: string;
  triggerClassName?: string;
};

const LazyUserProfilePreviewPopoverContent = dynamic(
  () =>
    import("./UserProfilePreviewPopoverContent").then(
      (mod) => mod.UserProfilePreviewPopoverContent,
    ),
  {
    ssr: false,
  },
);

function getCurrentRedirectPath(pathname: string, locale: string) {
  if (pathname === `/${locale}`) {
    return "/";
  }

  if (pathname.startsWith(`/${locale}/`)) {
    return pathname.slice(locale.length + 1) || "/";
  }

  return pathname || "/";
}

export function UserProfilePreviewPopover({
  avatarUrl,
  children,
  isGuest = false,
  isAuthenticated = false,
  locale,
  nickname,
  profileId,
  triggerClassName,
}: UserProfilePreviewPopoverProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [popoverStyle, setPopoverStyle] = useState<{
    left: number;
    top: number;
  } | null>(null);
  const closeTimerRef = useRef<number | null>(null);
  const isPinnedOpenRef = useRef(false);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const redirectPath = useMemo(
    () => getCurrentRedirectPath(pathname, locale),
    [locale, pathname],
  );

  function isDesktopPointer() {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }

    return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  }

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    cancelScheduledClose();
    isPinnedOpenRef.current = false;
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        window.clearTimeout(closeTimerRef.current);
      }
    };
  }, []);

  useLayoutEffect(() => {
    if (!isOpen || !rootRef.current || typeof window === "undefined") {
      return;
    }

    function updatePosition() {
      if (!rootRef.current) {
        return;
      }

      const rect = rootRef.current.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportPadding = 8;
      const desktopWidth = 228;
      const mobileWidth = Math.min(228, viewportWidth - viewportPadding * 2);
      const width = isDesktopPointer() ? desktopWidth : mobileWidth;
      const preferredLeft = isDesktopPointer()
        ? rect.left
        : rect.left + rect.width / 2 - width / 2;
      const left = Math.min(
        Math.max(preferredLeft, viewportPadding),
        viewportWidth - width - viewportPadding,
      );

      setPopoverStyle({
        left,
        top: rect.bottom + 8,
      });
    }

    updatePosition();
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);

    return () => {
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const targetNode = event.target as Node;
      const isInsideTrigger = rootRef.current?.contains(targetNode);
      const isInsidePopover = popoverRef.current?.contains(targetNode);

      if (!isInsideTrigger && !isInsidePopover) {
        isPinnedOpenRef.current = false;
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        isPinnedOpenRef.current = false;
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isOpen]);

  function cancelScheduledClose() {
    if (closeTimerRef.current === null) {
      return;
    }

    window.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }

  function openPopover(pin = false) {
    cancelScheduledClose();
    isPinnedOpenRef.current = pin;
    setIsOpen(true);
  }

  function scheduleClose() {
    cancelScheduledClose();

    if (isPinnedOpenRef.current) {
      return;
    }

    closeTimerRef.current = window.setTimeout(() => {
      closeTimerRef.current = null;

      if (!isPinnedOpenRef.current) {
        setIsOpen(false);
      }
    }, 180);
  }

  return (
    <div
      ref={rootRef}
      className="relative inline-flex"
      onMouseEnter={() => {
        if (isDesktopPointer()) {
          openPopover(false);
        }
      }}
      onMouseLeave={() => {
        if (isDesktopPointer()) {
          scheduleClose();
        }
      }}
    >
      <button
        type="button"
        className={cn(
          "inline-flex cursor-pointer items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d88d72]/35",
          triggerClassName,
        )}
        aria-expanded={isOpen}
        aria-label={nickname}
        onClick={() => {
          cancelScheduledClose();
          const nextOpen = !(isOpen && isPinnedOpenRef.current);
          isPinnedOpenRef.current = nextOpen;
          setIsOpen(nextOpen);
        }}
      >
        {children}
      </button>
      {isOpen && isMounted && popoverStyle
        ? createPortal(
            <div
              ref={popoverRef}
              className="fixed z-[120] max-sm:w-[min(14.25rem,calc(100vw-1rem))] sm:w-[228px]"
              style={popoverStyle}
              onMouseEnter={() => {
                if (isDesktopPointer()) {
                  cancelScheduledClose();
                }
              }}
              onMouseLeave={() => {
                if (isDesktopPointer()) {
                  scheduleClose();
                }
              }}
            >
              <LazyUserProfilePreviewPopoverContent
                avatarUrl={avatarUrl}
                isGuest={isGuest}
                isAuthenticated={isAuthenticated}
                locale={locale}
                nickname={nickname}
                profileId={profileId}
                redirectPath={redirectPath}
              />
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
