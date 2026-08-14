"use client";

import { useMemo, useState, type ReactNode } from "react";
import { MobileBottomSheet } from "@/components/ui/MobileBottomSheet";
import { cn } from "@/lib/utils";

type MobileActivityDetailSheetLinkProps = {
  children: ReactNode;
  className?: string;
  href: string;
  label: string;
};

function appendActivitySheetParam(href: string) {
  try {
    const base =
      typeof window === "undefined" ? "https://friemi.local" : window.location.origin;
    const url = new URL(href, base);
    url.searchParams.set("sheet", "1");

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    const [pathWithSearch = href, hash = ""] = href.split("#");
    const [path = pathWithSearch, search = ""] = pathWithSearch.split("?");
    const params = new URLSearchParams(search);
    params.set("sheet", "1");

    return `${path}?${params.toString()}${hash ? `#${hash}` : ""}`;
  }
}

export function MobileActivityDetailSheetLink({
  children,
  className,
  href,
  label,
}: MobileActivityDetailSheetLinkProps) {
  const [open, setOpen] = useState(false);
  const sheetHref = useMemo(() => appendActivitySheetParam(href), [href]);

  return (
    <>
      <button
        aria-label={label}
        className={cn("min-w-0 text-left", className)}
        onClick={() => setOpen(true)}
        type="button"
      >
        {children}
      </button>
      <MobileBottomSheet
        ariaLabel={label}
        bodyClassName="overflow-hidden"
        closeLabel={label}
        initiallyExpanded
        onClose={() => setOpen(false)}
        open={open}
        zIndexClassName="z-[80]"
      >
        <iframe
          className="h-full w-full border-0 bg-white"
          loading="lazy"
          src={sheetHref}
          title={label}
        />
      </MobileBottomSheet>
    </>
  );
}
