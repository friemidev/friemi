"use client";

import { useEffect, useRef } from "react";

export function ProfileVisitTracker({
  profileId,
}: {
  profileId: string;
}) {
  const sentRef = useRef(false);

  useEffect(() => {
    if (sentRef.current) {
      return;
    }

    sentRef.current = true;

    void fetch("/api/profile-visits", {
      body: JSON.stringify({ profileId }),
      headers: {
        "Content-Type": "application/json",
      },
      keepalive: true,
      method: "POST",
    }).catch(() => {
      sentRef.current = false;
    });
  }, [profileId]);

  return null;
}
