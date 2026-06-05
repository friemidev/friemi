import { cn } from "@/lib/utils";

const loadingLabels = {
  "zh-CN": "加载中",
  en: "Loading",
  fr: "Chargement",
} as const;

type BrandLoaderProps = {
  className?: string;
  label?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
};

const loaderSizes = {
  sm: "nextfun-brand-loader--sm",
  md: "nextfun-brand-loader--md",
  lg: "nextfun-brand-loader--lg",
};

export function BrandLoader({
  className,
  label = loadingLabels["zh-CN"],
  showLabel = false,
  size = "md",
}: BrandLoaderProps) {
  const screenReaderLabel = `${label}...`;

  return (
    <div
      className={cn(
        "inline-flex flex-col items-center justify-center gap-3",
        className,
      )}
      role="status"
      aria-live="polite"
      aria-label={screenReaderLabel}
    >
      <span className={cn("nextfun-brand-loader", loaderSizes[size])} aria-hidden="true">
        <span className="nextfun-brand-loader__halo" />
        <span className="nextfun-brand-loader__ring" />
        <span className="nextfun-brand-loader__logo">
          <img src="/logo-icon.png" alt="" />
        </span>
      </span>
      {showLabel ? (
        <span className="inline-flex items-baseline text-base font-semibold text-zinc-700">
          <span>{label}</span>
          <span className="nextfun-loading-dots" aria-hidden="true">
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        </span>
      ) : (
        <span className="sr-only">{screenReaderLabel}</span>
      )}
    </div>
  );
}

export function getLoadingLabel(locale: string) {
  if (locale === "en" || locale === "fr" || locale === "zh-CN") {
    return loadingLabels[locale];
  }

  return loadingLabels["zh-CN"];
}
