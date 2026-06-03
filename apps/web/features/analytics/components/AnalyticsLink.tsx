"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { trackClientAnalyticsEvent } from "@/features/analytics/client";
import type { AnalyticsEventInput } from "@/features/analytics/events";

type AnalyticsLinkProps = {
  ariaLabel?: string;
  children: ReactNode;
  className?: string;
  event: Omit<AnalyticsEventInput, "locale" | "route">;
  href: string;
  prefetch?: boolean;
};

export function AnalyticsLink({
  ariaLabel,
  children,
  className,
  event,
  href,
  prefetch = false,
}: AnalyticsLinkProps) {
  return (
    <Link
      aria-label={ariaLabel}
      className={className}
      href={href}
      onClick={() => trackClientAnalyticsEvent(event)}
      prefetch={prefetch}
    >
      {children}
    </Link>
  );
}
