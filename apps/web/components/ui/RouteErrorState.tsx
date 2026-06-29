"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { PageContainer } from "@/components/layout/PageContainer";
import { brand } from "@/lib/brand";
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
        className="relative mx-auto max-w-xl overflow-hidden rounded-[1.35rem] border border-sand bg-paper/80 p-6 text-center shadow-[0_18px_42px_rgba(21,98,64,0.08)] sm:p-8"
        role="alert"
      >
        <span
          className="pointer-events-none absolute inset-x-10 -top-16 h-28 rounded-full bg-[#F1F2EC]/55 blur-2xl"
          aria-hidden="true"
        />
        <span className="relative mx-auto flex h-14 w-14 items-center justify-center overflow-hidden rounded-2xl bg-fog ring-1 ring-sand">
          <Image
            src={brand.emptyStateIconPath}
            alt=""
            width={56}
            height={56}
            className="h-full w-full scale-[1.55] object-cover"
          />
          <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-rose text-danger ring-1 ring-coral/40">
            <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </span>
        <h1 className="relative mt-4 text-lg font-semibold text-ink">
          {t.loadFailed}
        </h1>
        <p className="relative mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-600">
          {t.retryDatabase}
        </p>
        <button
          className="relative mt-5 inline-flex h-11 items-center justify-center gap-2 rounded-full bg-moss px-5 text-sm font-semibold text-white shadow-[0_10px_22px_rgba(21,98,64,0.18)] transition hover:bg-meadow focus:outline-none focus-visible:ring-2 focus-visible:ring-meadow focus-visible:ring-offset-2"
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
