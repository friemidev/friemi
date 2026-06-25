"use client";

import type { ReactNode } from "react";

export function ActivityResultsFilterBar({
  viewToggle,
}: {
  viewToggle: ReactNode;
}) {
  return (
    <div className="shrink-0 sm:w-auto">
      <div className="min-w-0">{viewToggle}</div>
    </div>
  );
}
