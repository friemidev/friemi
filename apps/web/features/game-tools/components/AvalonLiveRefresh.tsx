"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, useTransition } from "react";
import { cn } from "@/lib/utils";

type AvalonLiveRefreshProps = {
  enabled: boolean;
  intervalMs?: number;
  locale?: string;
  variant?: "floating" | "inline";
};

export function AvalonLiveRefresh({
  enabled,
  intervalMs = 3200,
  locale = "zh-CN",
  variant = "floating",
}: AvalonLiveRefreshProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [online, setOnline] = useState(true);
  const [pulse, setPulse] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const t = getLiveRefreshCopy(locale);
  const refresh = useCallback(() => {
    if (!enabled) {
      return;
    }

    if (!window.navigator.onLine) {
      setOnline(false);
      return;
    }

    setOnline(true);
    setPulse(true);
    startTransition(() => {
      router.refresh();
      setLastSyncedAt(new Date());
    });
    window.setTimeout(() => setPulse(false), 850);
  }, [enabled, router, startTransition]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    setOnline(window.navigator.onLine);
    setLastSyncedAt(new Date());

    const getInterval = () => (document.hidden ? Math.max(intervalMs * 3, 9000) : intervalMs);
    let interval = window.setInterval(refresh, getInterval());

    const resetInterval = () => {
      window.clearInterval(interval);
      interval = window.setInterval(refresh, getInterval());
    };
    const handleFocus = () => refresh();
    const handleOnline = () => refresh();
    const handleOffline = () => setOnline(false);
    const handleVisibility = () => {
      resetInterval();
      if (!document.hidden) {
        refresh();
      }
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [enabled, intervalMs, refresh]);

  if (!enabled) {
    return null;
  }

  const label = !online ? t.offline : isPending || pulse ? t.syncing : t.synced;

  return (
    <button
      aria-live="polite"
      className={cn(
        "flex items-center gap-2 rounded-full border border-[#D6D5B2] bg-[#FEFFF9]/92 text-xs font-black text-[#156240] shadow-lg shadow-[#156240]/10 backdrop-blur transition active:scale-95",
        variant === "floating"
          ? "fixed right-3 top-24 z-40 px-2.5 py-1.5 hover:-translate-y-0.5 sm:right-4"
          : "h-10 shrink-0 px-2.5 py-1",
      )}
      onClick={refresh}
      title={
        lastSyncedAt
          ? `${t.synced} ${lastSyncedAt.toLocaleTimeString()}`
          : label
      }
      type="button"
    >
      <Image
        alt=""
        className={cn(
          "h-6 w-6 object-contain transition",
          online ? "opacity-75" : "grayscale opacity-45",
          (pulse || isPending) && "scale-125 opacity-100",
        )}
        height={28}
        src="/game-tools/avalon/states/live-sync-token.svg"
        width={28}
      />
      <span
        className={
          variant === "floating"
            ? "hidden sm:inline"
            : online
              ? "hidden lg:inline"
              : "inline"
        }
      >
        {label}
      </span>
      <span
        className={cn(
          "h-2 w-2 rounded-full",
          online ? "bg-[#369758]" : "bg-[#F09182]",
          (pulse || isPending) && "animate-pulse",
        )}
      />
    </button>
  );
}

function getLiveRefreshCopy(locale: string) {
  if (locale === "fr") {
    return {
      offline: "Hors ligne",
      synced: "Synchronisé",
      syncing: "Synchro",
    };
  }

  if (locale === "en") {
    return {
      offline: "Offline",
      synced: "Synced",
      syncing: "Syncing",
    };
  }

  return {
    offline: "离线",
    synced: "已同步",
    syncing: "同步中",
  };
}
