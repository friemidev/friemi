"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, type ComponentProps } from "react";

type IntentPrefetchLinkProps = Omit<ComponentProps<typeof Link>, "href"> & {
  href: string;
  prefetchDelayMs?: number;
};

export function IntentPrefetchLink({
  href,
  onFocus,
  onMouseEnter,
  onMouseLeave,
  onTouchStart,
  prefetchDelayMs = 120,
  ...props
}: IntentPrefetchLinkProps) {
  const router = useRouter();
  const prefetchTimerRef = useRef<number | null>(null);
  const hasPrefetchedRef = useRef(false);

  useEffect(() => {
    return () => {
      if (prefetchTimerRef.current !== null) {
        window.clearTimeout(prefetchTimerRef.current);
      }
    };
  }, []);

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
