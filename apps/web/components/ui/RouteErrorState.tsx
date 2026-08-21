"use client";

import { usePathname } from "next/navigation";
import { AppRecoveryScreen } from "@/components/ui/AppRecoveryScreen";

function getLocaleFromPathname(pathname: string | null) {
  return pathname?.split("/").filter(Boolean)[0] ?? "zh-CN";
}

export function RouteErrorState({
  reset,
}: {
  reset: () => void;
}) {
  const pathname = usePathname();
  const locale = getLocaleFromPathname(pathname);

  return (
    <AppRecoveryScreen
      locale={locale}
      onRefresh={() => {
        reset();
        window.setTimeout(() => window.location.reload(), 80);
      }}
    />
  );
}

export type RouteErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};
