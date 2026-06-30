"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type AvalonLiveRefreshProps = {
  enabled: boolean;
  intervalMs?: number;
};

export function AvalonLiveRefresh({
  enabled,
  intervalMs = 4500,
}: AvalonLiveRefreshProps) {
  const router = useRouter();
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const interval = window.setInterval(() => {
      setPulse(true);
      router.refresh();
      window.setTimeout(() => setPulse(false), 900);
    }, intervalMs);

    return () => window.clearInterval(interval);
  }, [enabled, intervalMs, router]);

  if (!enabled) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed right-4 top-24 z-40 hidden rounded-full border border-[#D6D5B2] bg-[#FEFFF9]/90 p-1.5 shadow-lg shadow-[#156240]/10 backdrop-blur sm:flex"
    >
      <Image
        alt=""
        className={[
          "h-6 w-6 object-contain transition",
          pulse ? "scale-125 opacity-100" : "opacity-55",
        ].join(" ")}
        height={28}
        src="/game-tools/avalon/states/live-sync-token.svg"
        width={28}
      />
    </div>
  );
}
