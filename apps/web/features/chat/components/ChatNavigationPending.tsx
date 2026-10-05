"use client";

import { useLinkStatus } from "next/link";
import { LoaderCircle } from "lucide-react";

export function ChatNavigationPending() {
  const { pending } = useLinkStatus();
  if (!pending) return null;
  return (
    <span
      aria-hidden="true"
      className="chat-navigation-pending pointer-events-none absolute inset-0 z-10 flex items-center justify-end bg-[#ECF5EF]/75 pr-3"
    >
      <LoaderCircle className="h-5 w-5 animate-spin text-[#156240] motion-reduce:animate-none" />
    </span>
  );
}
