"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { consumeChatRosterVisits } from "@/features/chat/chatRosterReturn";
import { withLocale } from "@/lib/routes";

// The standalone /messages page also comes back from Next's history cache.
export function MessageRosterOnReturn({ locale }: { locale: string }) {
  const router = useRouter();

  useEffect(() => {
    const refreshAfterReturn = () => {
      if (
        window.location.pathname === withLocale(locale, "/messages") &&
        consumeChatRosterVisits().length > 0
      ) {
        router.refresh();
      }
    };

    refreshAfterReturn();
    window.addEventListener("popstate", refreshAfterReturn);
    window.addEventListener("pageshow", refreshAfterReturn);
    return () => {
      window.removeEventListener("popstate", refreshAfterReturn);
      window.removeEventListener("pageshow", refreshAfterReturn);
    };
  }, [locale, router]);

  return null;
}
