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
  const [storedHref, setStoredHref] = useState<string | null>(null);
  const href = storedHref ?? fallbackHref;

  useEffect(() => {
    setStoredHref(readMessageThreadReturnHref());
  }, []);

  return (
    <Link
      aria-label={ariaLabel}
      className={className}
      href={href}
      title={title}
      onClick={(event) => {
        if (!storedHref || window.history.length <= 1) {
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
