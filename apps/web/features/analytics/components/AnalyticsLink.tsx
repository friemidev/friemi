"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { trackClientAnalyticsEvent } from "@/features/analytics/client";
import type { AnalyticsEventInput } from "@/features/analytics/events";
import {
  saveDetailSourceContext,
  type DetailSourceInput,
} from "@/features/navigation/contextualDetailReturn";

type AnalyticsLinkProps = {
  ariaLabel?: string;
  children: ReactNode;
  className?: string;
  event: Omit<AnalyticsEventInput, "locale" | "route">;
  href: string;
  detailSource?: DetailSourceInput;
  disabled?: boolean;
  prefetch?: boolean;
};

export function AnalyticsLink({
  ariaLabel,
  children,
  className,
  detailSource,
  disabled = false,
  event,
  href,
  prefetch = false,
}: AnalyticsLinkProps) {
  if (disabled) {
    return (
      <div aria-disabled="true" className={className}>
        {children}
      </div>
    );
  }

  return (
    <Link
      aria-label={ariaLabel}
      className={className}
      href={href}
      onClick={() => {
        if (detailSource) {
          saveDetailSourceContext(detailSource, href);
        }
        trackClientAnalyticsEvent(event);
      }}
      prefetch={prefetch}
    >
      {children}
    </Link>
  );
}
