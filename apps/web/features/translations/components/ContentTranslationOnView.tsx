"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Mounting means a real visitor opened the detail page. Next.js prefetches,
// server-side metadata generation and list rendering never call the provider.
export function ContentTranslationOnView({
  entityId,
  entityType,
  locale,
  accessToken,
}: {
  entityId: string;
  entityType: "activity" | "public_event";
  locale: string;
  accessToken?: string | null;
}) {
  const router = useRouter();
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    async function translate() {
      try {
        const response = await fetch("/api/translations/warmup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entityId, entityType, locale, accessToken }),
        });
        if (!active || !response.ok) return;
        const result = (await response.json()) as {
          ready: boolean;
          paused: string | null;
          retryAfterSeconds: number;
        };
        if (!active) return;
        if (result.ready) router.refresh();
        else if (!result.paused && ++attempts < 3)
          timer = setTimeout(translate, result.retryAfterSeconds * 1000);
      } catch {
        /* Keep the original readable; a later visit/worker can retry. */
      }
    }
    void translate();
    return () => {
      active = false;
      if (timer) clearTimeout(timer);
    };
  }, [entityId, entityType, locale, accessToken, router]);
  return null;
}
