"use client";

import type { ReactNode } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  type DetailSourceContext,
  getCurrentPathHref,
  getDetailSourceForCurrentTarget,
  writeDetailSourceContext,
} from "@/features/navigation/contextualDetailReturn";
import { cn } from "@/lib/utils";

type ActivityHistoryBackButtonProps = {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  fallbackHref: string;
};

const activityDetailReturnSourceStorageKey =
  "friemi:activity-detail-return-source";

function isLowerLevelActivityHref(href: string) {
  return /\/lobby\/[^/?#]+\/room(?:[/?#]|$)/.test(href);
}

function isSafeSourceContext(context: DetailSourceContext | null) {
  if (!context || context.sourceKey === "activity_detail") {
    return false;
  }

  if (isLowerLevelActivityHref(context.sourceHref)) {
    return context.sourceKey === "messages";
  }

  return true;
}

function getCurrentTargetPath() {
  return getCurrentPathHref().split("#")[0];
}

function getContextTargetPath(context: DetailSourceContext) {
  return context.targetHref.split("#")[0];
}

function saveActivityDetailReturnSource(context: DetailSourceContext) {
  try {
    window.sessionStorage.setItem(
      activityDetailReturnSourceStorageKey,
      JSON.stringify(context),
    );
  } catch {
    // Ignore unavailable storage in embedded or private contexts.
  }
}

function readActivityDetailReturnSource() {
  try {
    const raw = window.sessionStorage.getItem(
      activityDetailReturnSourceStorageKey,
    );

    if (!raw) {
      return null;
    }

    const context = JSON.parse(raw) as DetailSourceContext;

    if (
      !context ||
      context.version !== 1 ||
      context.expiresAt < Date.now() ||
      getContextTargetPath(context) !== getCurrentTargetPath() ||
      !isSafeSourceContext(context)
    ) {
      window.sessionStorage.removeItem(activityDetailReturnSourceStorageKey);
      return null;
    }

    return context;
  } catch {
    return null;
  }
}

function getSafeSourceContext() {
  const sourceContext = getDetailSourceForCurrentTarget();

  return isSafeSourceContext(sourceContext) ? sourceContext : null;
}

export function ActivityHistoryBackButton({
  ariaLabel,
  children,
  className,
  fallbackHref,
}: ActivityHistoryBackButtonProps) {
  const router = useRouter();

  useEffect(() => {
    const sourceContext = getSafeSourceContext();

    if (sourceContext) {
      saveActivityDetailReturnSource(sourceContext);
    }
  }, []);

  return (
    <button
      aria-label={ariaLabel}
      className={cn(className)}
      type="button"
      onClick={() => {
        const sourceContext =
          getSafeSourceContext() ?? readActivityDetailReturnSource();

        if (sourceContext) {
          writeDetailSourceContext(sourceContext);
          router.replace(sourceContext.sourceHref);
          return;
        }

        router.replace(fallbackHref);
      }}
    >
      {children}
    </button>
  );
}
