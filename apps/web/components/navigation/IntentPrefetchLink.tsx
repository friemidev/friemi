"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, type ComponentProps } from "react";

type IntentPrefetchLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
  prefetchDelayMs?: number;
  prefetchOnVisible?: boolean;
};

export function IntentPrefetchLink({
  href,
  onFocus,
  onMouseEnter,
  onMouseLeave,
  onTouchStart,
  prefetchDelayMs = 120,
  prefetchOnVisible = false,
  ...props
}: IntentPrefetchLinkProps) {
  const router = useRouter();
  const linkRef = useRef<HTMLAnchorElement | null>(null);
  const prefetchTimerRef = useRef<number | null>(null);
  const hasPrefetchedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (prefetchTimerRef.current !== null) {
        window.clearTimeout(prefetchTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!prefetchOnVisible || hasPrefetchedRef.current) {
      return;
    }

    const linkElement = linkRef.current;

    if (!linkElement) {
      return;
    }

    if (typeof IntersectionObserver !== "function") {
      schedulePrefetch();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          schedulePrefetch();
        }
      },
      {
        rootMargin: "160px 0px",
        threshold: 0.01,
      },
    );

    observer.observe(linkElement);

    return () => observer.disconnect();
  }, [prefetchOnVisible]);

  function prefetchNow() {
    if (hasPrefetchedRef.current) {
      return;
    }

    hasPrefetchedRef.current = true;
    router.prefetch(href);
  }

  function schedulePrefetch() {
    if (hasPrefetchedRef.current || prefetchTimerRef.current !== null) {
      return;
    }

    prefetchTimerRef.current = window.setTimeout(() => {
      prefetchTimerRef.current = null;
      prefetchNow();
    }, prefetchDelayMs);
  }

  function cancelScheduledPrefetch() {
    if (prefetchTimerRef.current === null) {
      return;
    }

    window.clearTimeout(prefetchTimerRef.current);
    prefetchTimerRef.current = null;
  }

  return (
    <Link
      {...props}
      href={href}
      prefetch={false}
      ref={linkRef}
      onFocus={(event) => {
        prefetchNow();
        onFocus?.(event);
      }}
      onMouseEnter={(event) => {
        schedulePrefetch();
        onMouseEnter?.(event);
      }}
      onMouseLeave={(event) => {
        cancelScheduledPrefetch();
        onMouseLeave?.(event);
      }}
      onTouchStart={(event) => {
        prefetchNow();
        onTouchStart?.(event);
      }}
    />
  );
}
