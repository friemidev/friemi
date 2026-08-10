"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { readMessageThreadReturnHref } from "../utils/messageThreadReturn";

type MessageThreadBackButtonProps = {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  fallbackHref: string;
  title: string;
};

export function MessageThreadBackButton({
  ariaLabel,
  children,
  className,
  fallbackHref,
  title,
}: MessageThreadBackButtonProps) {
  const router = useRouter();
  const [canUseHistoryReturn, setCanUseHistoryReturn] = useState(false);
  const [storedHref, setStoredHref] = useState<string | null>(null);
  const href = storedHref ?? fallbackHref;

  useEffect(() => {
    const nextStoredHref = readMessageThreadReturnHref();
    let hasInternalNonMessagesReferrer = false;

    try {
      const referrer = document.referrer
        ? new URL(document.referrer)
        : null;

      hasInternalNonMessagesReferrer =
        Boolean(referrer) &&
        referrer?.origin === window.location.origin &&
        !referrer.pathname.includes("/messages");
    } catch {
      hasInternalNonMessagesReferrer = false;
    }

    setStoredHref(nextStoredHref);
    setCanUseHistoryReturn(
      Boolean(nextStoredHref) || hasInternalNonMessagesReferrer,
    );
  }, []);

  return (
    <Link
      aria-label={ariaLabel}
      className={className}
      href={href}
      title={title}
      onClick={(event) => {
        if (!canUseHistoryReturn || window.history.length <= 1) {
          return;
        }

        event.preventDefault();
        router.back();
      }}
    >
      {children}
    </Link>
  );
}
