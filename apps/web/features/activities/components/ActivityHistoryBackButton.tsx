"use client";

import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import { writeActivityListBackLoopGuard } from "@/features/activities/utils/activityBackLoopGuard";
import { getDetailSourceForCurrentTarget } from "@/features/navigation/contextualDetailReturn";
import { cn } from "@/lib/utils";

type ActivityHistoryBackButtonProps = {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  fallbackHref: string;
};

const activityDetailReturnSourceStorageKey =
  "friemi:activity-detail-return-source";

function clearStoredActivityDetailReturnSource() {
  try {
    window.sessionStorage.removeItem(activityDetailReturnSourceStorageKey);
  } catch {
    // Ignore unavailable storage in embedded or private contexts.
  }
}

function markActivityListBackLoopGuard() {
  const sourceContext = getDetailSourceForCurrentTarget();

  if (sourceContext?.sourceKey === "activity_list") {
    writeActivityListBackLoopGuard(sourceContext.sourceHref);
  }
}

export function ActivityHistoryBackButton({
  ariaLabel,
  children,
  className,
  fallbackHref,
}: ActivityHistoryBackButtonProps) {
  const router = useRouter();

  return (
    <button
      aria-label={ariaLabel}
      className={cn(className)}
      type="button"
      onClick={() => {
        markActivityListBackLoopGuard();
        clearStoredActivityDetailReturnSource();

        if (window.history.length > 1) {
          router.back();
          return;
        }

        router.replace(fallbackHref);
      }}
    >
      {children}
    </button>
  );
}
