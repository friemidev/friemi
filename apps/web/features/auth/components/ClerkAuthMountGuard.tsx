"use client";

import { SignIn, SignUp } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { BrandLoader, getLoadingLabel } from "@/components/ui/BrandLoader";

type ClerkAuthMountGuardProps = {
  fallbackRedirectUrl: string;
  forceRedirectUrl: string;
  mode: "sign-in" | "sign-up";
  path: string;
  secondaryUrl: string;
  locale: string;
};

export function ClerkAuthMountGuard({
  fallbackRedirectUrl,
  forceRedirectUrl,
  mode,
  path,
  secondaryUrl,
  locale,
}: ClerkAuthMountGuardProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex min-h-[32rem] w-full items-center justify-center">
        <BrandLoader
          label={getLoadingLabel(locale)}
          showLabel
          size="md"
        />
      </div>
    );
  }

  if (mode === "sign-in") {
    return (
      <SignIn
        fallbackRedirectUrl={fallbackRedirectUrl}
        forceRedirectUrl={forceRedirectUrl}
        path={path}
        routing="path"
        signUpUrl={secondaryUrl}
      />
    );
  }

  return (
    <SignUp
      fallbackRedirectUrl={fallbackRedirectUrl}
      forceRedirectUrl={forceRedirectUrl}
      path={path}
      routing="path"
      signInUrl={secondaryUrl}
    />
  );
}
