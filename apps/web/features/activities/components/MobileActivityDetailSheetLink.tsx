"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { LockKeyhole, Maximize2 } from "lucide-react";
import { MobileBottomSheet } from "@/components/ui/MobileBottomSheet";
import { cn } from "@/lib/utils";

type MobileActivityDetailSheetLinkProps = {
  children: ReactNode;
  className?: string;
  href: string;
  label: string;
  locale?: string;
  locked?: boolean;
};

const fullPageNavigationDelayMs = 1000;

function getLockedCopy(locale: string) {
  if (locale === "fr") {
    return {
      description:
        "Cette sortie privee est accessible aux amis qui se suivent mutuellement.",
      title: "Sortie privee verrouillee",
    };
  }

  if (locale === "en") {
    return {
      description:
        "This private plan is available to friends who follow each other.",
      title: "Private plan locked",
    };
  }

  return {
    description: "这是私密聚吧，仅限发起人好友才能申请。",
    title: "私密聚吧已锁定",
  };
}

function appendActivitySheetParam(href: string) {
  try {
    const base =
      typeof window === "undefined"
        ? "https://friemi.local"
        : window.location.origin;
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

function getOpenPageLabel(locale: string) {
  if (locale === "fr") return "Ouvrir la page complète";
  if (locale === "en") return "Open full page";

  return "打开完整页面";
}

export function MobileActivityDetailSheetLink({
  children,
  className,
  href,
  label,
  locale = "zh-CN",
  locked = false,
}: MobileActivityDetailSheetLinkProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const fullPageNavigationTimerRef = useRef<number | null>(null);
  const sheetHref = useMemo(() => appendActivitySheetParam(href), [href]);
  const lockedCopy = getLockedCopy(locale);
  const openPageLabel = getOpenPageLabel(locale);

  useEffect(() => {
    return () => {
      if (fullPageNavigationTimerRef.current !== null) {
        window.clearTimeout(fullPageNavigationTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (open && !locked) {
      router.prefetch(href);
    }
  }, [href, locked, open, router]);

  function openFullPage() {
    if (fullPageNavigationTimerRef.current !== null) {
      return;
    }

    // Reveal the existing list while the prefetched detail route settles.
    // This keeps the route-level loader out of the closing sheet.
    setOpen(false);
    router.prefetch(href);
    fullPageNavigationTimerRef.current = window.setTimeout(() => {
      fullPageNavigationTimerRef.current = null;
      router.push(href);
    }, fullPageNavigationDelayMs);
  }

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
        headerAction={
          locked ? undefined : (
            <button
              aria-label={openPageLabel}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white text-[#156240] ring-1 ring-[#D6D5B2] transition hover:bg-[#F6FAF4] active:scale-95"
              onClick={openFullPage}
              title={openPageLabel}
              type="button"
            >
              <Maximize2 className="h-4 w-4" aria-hidden="true" />
            </button>
          )
        }
        initiallyExpanded
        onClose={() => setOpen(false)}
        open={open}
        zIndexClassName="z-[80]"
      >
        {locked ? (
          <div className="flex h-full min-h-[19rem] flex-col items-center justify-center bg-white px-8 pb-[max(2rem,env(safe-area-inset-bottom))] text-center">
            <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#EAF5E8] text-[#096B45] ring-1 ring-[#BFD8B9]">
              <LockKeyhole className="h-6 w-6" aria-hidden="true" />
            </span>
            <h2 className="mt-5 text-[20px] font-bold leading-tight text-[#111210]">
              {lockedCopy.title}
            </h2>
            <p className="mt-2 max-w-[18rem] text-[14px] font-medium leading-6 text-[#111210]/62">
              {lockedCopy.description}
            </p>
          </div>
        ) : (
          <iframe
            className="h-full w-full border-0 bg-white"
            loading="lazy"
            onLoad={(event) => {
              event.currentTarget.contentWindow?.scrollTo({
                behavior: "auto",
                left: 0,
                top: 0,
              });
            }}
            src={sheetHref}
            title={label}
          />
        )}
      </MobileBottomSheet>
    </>
  );
}
