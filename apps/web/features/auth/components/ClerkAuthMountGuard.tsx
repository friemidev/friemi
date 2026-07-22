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

const sharedAuthAppearance = {
  variables: {
    borderRadius: "1.15rem",
    colorBackground: "transparent",
    colorDanger: "#B5301F",
    colorInputBackground: "rgba(254,255,249,0.86)",
    colorInputText: "#1D1D1B",
    colorPrimary: "#156240",
    colorText: "#1D1D1B",
    colorTextSecondary: "rgba(21,98,64,0.68)",
    fontFamily: "var(--font-sans)",
  },
  elements: {
    alert: "rounded-[1rem] border-0 bg-[#FFF5E6] text-[#B5301F] shadow-none",
    card: "w-full border-0 bg-transparent p-0 shadow-none",
    cardBox: "w-full border-0 bg-transparent shadow-none",
    dividerLine: "bg-[#D6D5B2]/75",
    dividerRow: "my-5",
    dividerText: "text-xs font-extrabold uppercase text-[#8E8383]/74",
    footer: "mt-5 bg-transparent p-0 shadow-none",
    footerAction: "justify-center p-0 text-sm text-[#8E8383]",
    footerActionLink: "font-black text-[#156240] hover:text-[#B5301F]",
    footerActionText: "font-medium text-[#8E8383]",
    formButtonPrimary:
      "h-12 rounded-full border-0 bg-[#156240] text-sm font-black text-white shadow-[0_18px_34px_rgba(21,98,64,0.22)] transition hover:bg-[#369758] focus:shadow-[0_0_0_4px_rgba(138,182,142,0.32)]",
    formField: "space-y-2",
    formFieldInput:
      "h-12 rounded-[1.05rem] border border-[#D6D5B2]/80 bg-[#FEFFF9]/90 px-4 text-[15px] font-semibold text-[#1D1D1B] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] outline-none transition placeholder:text-[#8E8383]/62 focus:border-[#8AB68E] focus:ring-4 focus:ring-[#8AB68E]/22",
    formFieldLabel: "text-[13px] font-black text-[#156240]",
    formFieldRow: "space-y-2",
    formResendCodeLink: "font-black text-[#156240]",
    form: "space-y-5",
    header: "mb-5 text-center",
    headerSubtitle: "mt-2 text-sm font-semibold text-[#156240]/68",
    headerTitle: "text-2xl font-black tracking-normal text-[#1D1D1B]",
    identityPreview: "rounded-[1rem] border border-[#D6D5B2]/70 bg-[#FEFFF9]/80",
    main: "w-full",
    rootBox: "w-full",
    socialButtonsBlockButton:
      "h-12 rounded-full border border-[#D6D5B2]/72 bg-[#FEFFF9]/86 text-[#1D1D1B] shadow-[0_10px_26px_rgba(21,98,64,0.065)] transition hover:-translate-y-0.5 hover:border-[#8AB68E] hover:bg-white",
    socialButtonsBlockButtonText: "text-sm font-black text-[#1D1D1B]/76",
    socialButtonsProviderIcon: "h-4 w-4",
  },
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

  const authAppearance = {
    ...sharedAuthAppearance,
    elements: {
      ...sharedAuthAppearance.elements,
      ...(mode === "sign-in" ? { header: "hidden" } : {}),
    },
  };

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
        appearance={authAppearance}
        fallbackRedirectUrl={fallbackRedirectUrl}
        forceRedirectUrl={forceRedirectUrl}
        path={path}
        routing="path"
        signUpFallbackRedirectUrl={forceRedirectUrl}
        signUpForceRedirectUrl={forceRedirectUrl}
        signUpUrl={secondaryUrl}
      />
    );
  }

  return (
    <SignUp
      appearance={authAppearance}
      fallbackRedirectUrl={fallbackRedirectUrl}
      forceRedirectUrl={forceRedirectUrl}
      path={path}
      routing="path"
      signInFallbackRedirectUrl={fallbackRedirectUrl}
      signInForceRedirectUrl={forceRedirectUrl}
      signInUrl={secondaryUrl}
    />
  );
}
