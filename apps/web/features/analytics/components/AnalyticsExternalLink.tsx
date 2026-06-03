"use client";

import type { AnchorHTMLAttributes, ReactNode } from "react";
import type { AnalyticsEventInput } from "@/features/analytics/events";
import { trackClientAnalyticsEvent } from "@/features/analytics/client";

type AnalyticsExternalLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "children" | "href" | "onClick"
> & {
  children: ReactNode;
  event: Omit<AnalyticsEventInput, "locale" | "route">;
  href: string;
};

export function AnalyticsExternalLink({
  children,
  event,
  href,
  rel,
  target,
  ...props
}: AnalyticsExternalLinkProps) {
  return (
    <a
      {...props}
      href={href}
      onClick={() => trackClientAnalyticsEvent(event)}
      rel={rel ?? "noreferrer"}
      target={target ?? "_blank"}
    >
      {children}
    </a>
  );
}
