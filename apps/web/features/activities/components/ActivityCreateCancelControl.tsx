"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

type ActivityCreateCancelControlProps = {
  className?: string;
  fallbackHref: string;
  label: string;
  returnMode?: "history" | "path";
};

export function ActivityCreateCancelControl({
  className,
  fallbackHref,
  label,
  returnMode = "path",
}: ActivityCreateCancelControlProps) {
  const router = useRouter();

  return (
    <button
      className={cn(className)}
      type="button"
      onClick={() => {
        if (returnMode === "history" && window.history.length > 1) {
          router.back();
          return;
        }

        router.push(fallbackHref);
      }}
    >
      {label}
    </button>
  );
}
