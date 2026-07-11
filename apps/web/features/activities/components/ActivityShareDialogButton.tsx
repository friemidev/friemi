"use client";

import type { ReactNode } from "react";
import { Share2, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type ActivityShareDialogButtonProps = {
  children: ReactNode;
  className?: string;
  closeLabel: string;
  label: string;
};

export function ActivityShareDialogButton({
  children,
  className,
  closeLabel,
  label,
}: ActivityShareDialogButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        aria-label={label}
        className={cn(
          "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#156240] shadow-sm ring-1 ring-[#8AB68E] transition active:scale-95",
          className,
        )}
        onClick={() => setOpen(true)}
        type="button"
      >
        <Share2 className="h-4 w-4" strokeWidth={2.4} />
      </button>

      {open ? (
        <div
          aria-label={label}
          aria-modal="true"
          className="fixed inset-0 z-[85] flex items-end bg-black/38 px-3 pb-[calc(env(safe-area-inset-bottom)+0.8rem)] pt-[calc(env(safe-area-inset-top)+1rem)] sm:items-center sm:justify-center sm:p-6"
          role="dialog"
        >
          <button
            aria-label={closeLabel}
            className="absolute inset-0 cursor-default"
            onClick={() => setOpen(false)}
            type="button"
          />
          <div className="relative max-h-[82svh] w-full max-w-md overflow-y-auto rounded-[1.25rem] bg-[#FEFFF9] p-3 shadow-2xl ring-1 ring-[#8AB68E]">
            <button
              aria-label={closeLabel}
              className="absolute right-3 top-3 z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-zinc-600 shadow-sm ring-1 ring-[#D6D5B2] transition active:scale-95"
              onClick={() => setOpen(false)}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="pt-9">{children}</div>
          </div>
        </div>
      ) : null}
    </>
  );
}
