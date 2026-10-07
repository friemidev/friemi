"use client";

import { useLayoutEffect, useRef } from "react";
import {
  PrimaryTabState,
  primaryTabKey,
  type PrimaryTabSnapshot,
} from "./primaryTabState";
import { restoreDetailScroll } from "./restoreDetailScroll";

export function usePrimaryTabState(routeKey: string) {
  const state = useRef(new PrimaryTabState());
  const pending = useRef<PrimaryTabSnapshot | null>(null);

  const capture = () => {
    state.current.save(
      `${window.location.pathname}${window.location.search}`,
      window.scrollY,
    );
  };

  useLayoutEffect(() => {
    if (
      window.parent !== window ||
      !window.matchMedia("(max-width: 767px)").matches
    )
      return;
    const snapshot = pending.current;
    pending.current = null;
    const stop =
      snapshot && snapshot.href === routeKey
        ? restoreDetailScroll(snapshot.scrollY, 10_000)
        : undefined;
    const onScroll = () => {
      // A navigation can adjust scroll before React commits the next route.
      if (`${window.location.pathname}${window.location.search}` === routeKey)
        capture();
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      stop?.();
      window.removeEventListener("scroll", onScroll);
    };
  }, [routeKey]);

  return {
    href: (fallback: string) => state.current.get(fallback)?.href ?? fallback,
    navigate: (href: string) => {
      capture();
      const key = primaryTabKey(href);
      if (key && key === primaryTabKey(window.location.pathname)) {
        pending.current = null;
        return true;
      }
      pending.current = state.current.get(href);
      return false;
    },
    canRestore: (href: string) => Boolean(state.current.get(href)),
  };
}
