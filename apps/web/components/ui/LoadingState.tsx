import type { CSSProperties, ReactNode } from "react";
import { PageContainer } from "@/components/layout/PageContainer";
import { cn } from "@/lib/utils";
import { LocalizedBrandLoader } from "./LocalizedBrandLoader";

type ShimmerBlockProps = {
  className?: string;
  delay?: number;
  style?: CSSProperties;
};

export function ShimmerBlock({
  className,
  delay = 0,
  style,
}: ShimmerBlockProps) {
  return (
    <div
      aria-hidden="true"
      className={cn("friemi-shimmer rounded-lg", className)}
      style={{ animationDelay: `${delay}ms`, ...style }}
    />
  );
}

export function LoadingPageShell({
  children,
  className,
  loaderClassName,
}: {
  children: ReactNode;
  className?: string;
  loaderClassName?: string;
}) {
  return (
    <PageContainer className={cn("space-y-6", className)}>
      <div className={cn("flex justify-center py-2", loaderClassName)}>
        <LocalizedBrandLoader size="sm" showLabel />
      </div>
      {children}
    </PageContainer>
  );
}

export function LoadingHeroSkeleton({
  compact = false,
}: {
  compact?: boolean;
}) {
  return (
    <section
      className={cn(
        "rounded-[1.35rem] border border-sand bg-white/62 px-4 text-center shadow-[0_12px_28px_rgba(16,38,92,0.05)] sm:rounded-[2rem]",
        compact ? "py-4 sm:py-6" : "py-5 sm:px-8 sm:py-9",
      )}
    >
      <ShimmerBlock className="mx-auto h-7 w-28 rounded-full bg-white/75" />
      <ShimmerBlock className="mx-auto mt-4 h-10 w-44 rounded-xl bg-white/80" />
      <ShimmerBlock className="mx-auto mt-4 h-5 w-full max-w-xl rounded-md bg-white/70" />
      <ShimmerBlock className="mx-auto mt-2 h-5 w-2/3 max-w-md rounded-md bg-white/70" />
    </section>
  );
}

export function LoadingToolbarSkeleton({
  columns = 4,
}: {
  columns?: number;
}) {
  return (
    <section className="rounded-[1.1rem] border border-sand bg-white/70 p-2.5 shadow-sm sm:p-3">
      <div
        className="grid gap-2 md:grid-cols-[minmax(0,1fr)_repeat(var(--filter-columns),10rem)]"
        style={{ "--filter-columns": columns } as CSSProperties}
      >
        <ShimmerBlock className="h-10 rounded-xl sm:h-11" />
        {Array.from({ length: columns }).map((_, index) => (
          <ShimmerBlock
            key={index}
            className="hidden h-11 rounded-xl md:block"
            delay={index * 45}
          />
        ))}
      </div>
    </section>
  );
}

export function LoadingCardSkeleton({
  compact = false,
  delay = 0,
}: {
  compact?: boolean;
  delay?: number;
}) {
  return (
    <article className="overflow-hidden rounded-lg border border-black/10 bg-white/80 shadow-sm">
      <ShimmerBlock
        className={cn("rounded-none", compact ? "h-24 sm:h-32" : "h-36")}
        delay={delay}
      />
      <div className={cn("space-y-2.5 p-4", compact ? "p-3 sm:p-4" : null)}>
        <ShimmerBlock className="h-5 w-4/5" delay={delay + 50} />
        <ShimmerBlock className="h-5 w-3/5" delay={delay + 80} />
        <div className="space-y-2 pt-1">
          <ShimmerBlock className="h-4 w-32" delay={delay + 110} />
          <ShimmerBlock className="h-4 w-24" delay={delay + 140} />
        </div>
      </div>
    </article>
  );
}

export function LoadingRowSkeleton({
  action = false,
  avatar = "square",
  delay = 0,
}: {
  action?: boolean;
  avatar?: "circle" | "square";
  delay?: number;
}) {
  return (
    <article className="flex items-center gap-3 rounded-xl border border-black/10 bg-white/80 p-3 shadow-sm">
      <ShimmerBlock
        className={cn(
          "h-12 w-12 shrink-0",
          avatar === "circle" ? "rounded-full" : "rounded-lg",
        )}
        delay={delay}
      />
      <div className="min-w-0 flex-1 space-y-2">
        <ShimmerBlock className="h-4 w-4/5 max-w-64" delay={delay + 50} />
        <ShimmerBlock className="h-3 w-2/3 max-w-44" delay={delay + 90} />
      </div>
      {action ? (
        <ShimmerBlock
          className="hidden h-8 w-20 rounded-full sm:block"
          delay={delay + 130}
        />
      ) : null}
    </article>
  );
}

export function LoadingSectionHeader() {
  return (
    <div className="flex items-center gap-3">
      <ShimmerBlock className="h-10 w-10 rounded-full" />
      <div className="space-y-2">
        <ShimmerBlock className="h-5 w-28" />
        <ShimmerBlock className="h-3 w-40" />
      </div>
    </div>
  );
}
