"use client";

import { Languages, LoaderCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function TranslationIconButton({
  active = false,
  expanded,
  label,
  loading = false,
  onClick,
}: {
  active?: boolean;
  expanded?: boolean;
  label: string;
  loading?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-busy={loading}
      aria-expanded={expanded}
      disabled={loading}
      onClick={onClick}
      className="group -mx-2 inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest/40 disabled:cursor-wait disabled:opacity-60"
    >
      <span
        className={cn(
          "flex h-7 w-7 items-center justify-center rounded-full border text-forest transition group-hover:border-meadow group-hover:bg-fog group-active:scale-95",
          active ? "border-meadow/60 bg-fog" : "border-sand bg-paper",
        )}
      >
        {loading ? (
          <LoaderCircle
            className="h-3.5 w-3.5 animate-spin"
            aria-hidden="true"
          />
        ) : (
          <Languages className="h-3.5 w-3.5" aria-hidden="true" />
        )}
      </span>
    </button>
  );
}
