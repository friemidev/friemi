"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type SearchBackButtonProps = {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  fallbackHref: string;
};

export function SearchBackButton({
  ariaLabel,
  children,
  className,
  fallbackHref,
}: SearchBackButtonProps) {
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

        router.replace(fallbackHref);
      }}
    >
      {children}
    </button>
  );
}
