"use client";

import { usePathname } from "next/navigation";
import { BrandLoader, getLoadingLabel } from "@/components/ui/BrandLoader";

type LocalizedBrandLoaderProps = {
  className?: string;
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
};

function getLocaleFromPathname(pathname: string | null) {
  const locale = pathname?.split("/").filter(Boolean)[0] ?? "zh-CN";
  return locale;
}

export function LocalizedBrandLoader({
  className,
  showLabel,
  size,
}: LocalizedBrandLoaderProps) {
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);

  return (
    <BrandLoader
      className={className}
      label={getLoadingLabel(locale)}
      showLabel={showLabel}
      size={size}
    />
  );
}
