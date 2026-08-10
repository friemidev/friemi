"use client";

import Link from "next/link";
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
  return (
    <Link
      aria-label={ariaLabel}
      className={cn(className)}
      href={fallbackHref}
      replace
    >
      {children}
    </Link>
  );
}
