"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import { usePathname } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { getCopy } from "@/lib/copy";
import { cn } from "@/lib/utils";

function getLocaleFromPathname(pathname: string | null) {
  return pathname?.split("/").filter(Boolean)[0] ?? "zh-CN";
}

export function RouteErrorState({
  className,
  reset,
}: {
  className?: string;
  reset: () => void;
}) {
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);
  const t = getCopy(locale).common;

  return (
    <PageContainer className={cn("py-10 sm:py-14", className)}>
      <section
        className="mx-auto max-w-xl rounded-[1.25rem] border border-[#e1cdbb] bg-white/78 p-6 text-center shadow-[0_16px_38px_rgba(99,78,48,0.08)] sm:p-8"
        role="alert"
      >
        <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#fff4ef] text-[#9f4a3e] ring-1 ring-[#f0d2c7]">
          <AlertTriangle className="h-5 w-5" aria-hidden="true" />
        </span>
        <h1 className="mt-4 text-lg font-semibold text-ink">{t.loadFailed}</h1>
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-600">
          {t.retryDatabase}
        </p>
        <button
          className="mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-[#d88d72] px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#c87b61] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#d88d72] focus-visible:ring-offset-2"
          type="button"
          onClick={reset}
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          {t.retry}
        </button>
      </section>
    </PageContainer>
  );
}

export type RouteErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};
