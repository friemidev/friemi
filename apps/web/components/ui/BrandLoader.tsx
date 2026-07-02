import { cn } from "@/lib/utils";
import { brand } from "@/lib/brand";

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
  sm: "friemi-brand-loader--sm",
  md: "friemi-brand-loader--md",
  lg: "friemi-brand-loader--lg",
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
      <span
        className={cn("friemi-brand-loader", loaderSizes[size])}
        aria-hidden="true"
      >
        <picture className="friemi-brand-loader__media">
          <source
            srcSet={brand.logoFullBackgroundPath}
            media="(prefers-reduced-motion: reduce)"
          />
          <img src={brand.loadingImagePath} alt="" decoding="async" />
        </picture>
      </span>
      {showLabel ? (
        <span className="inline-flex items-baseline text-base font-semibold text-ink">
          <span>{label}</span>
          <span className="friemi-loading-dots" aria-hidden="true">
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
