"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type ActivityHistoryBackButtonProps = {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  fallbackHref: string;
};

export function ActivityHistoryBackButton({
  ariaLabel,
  children,
  className,
  fallbackHref,
}: ActivityHistoryBackButtonProps) {
  const router = useRouter();

  return (
    <button
      aria-label={ariaLabel}
      className={cn(className)}
      type="button"
      onClick={() => {
        if (window.history.length > 1) {
          router.back();
          return;
        }

        router.push(fallbackHref);
      }}
    >
      {children}
    </button>
  );
}
