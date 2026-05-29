"use client";

import { useEffect, useRef } from "react";

type MessageThreadScrollAnchorProps = {
  lastMessageId?: string;
};

export function MessageThreadScrollAnchor({
  lastMessageId,
}: MessageThreadScrollAnchorProps) {
  const anchorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    anchorRef.current?.scrollIntoView({ block: "end" });
  }, [lastMessageId]);

  return <div ref={anchorRef} aria-hidden="true" />;
}
