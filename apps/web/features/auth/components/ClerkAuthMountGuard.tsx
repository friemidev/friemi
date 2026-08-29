"use client";

import { registerPlugin } from "@capacitor/core";
import { SignIn, SignUp, useAuth, useSignIn } from "@clerk/nextjs";
import { ArrowLeft } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { BrandLoader, getLoadingLabel } from "@/components/ui/BrandLoader";

type NativeAuthProvider = "apple" | "google";

type NativeGoogleSignInResult = {
  accessToken?: string;
  email?: string;
  firstName?: string;
  idToken: string;
  lastName?: string;
  name?: string;
};

type NativeAppleSignInResult = {
  authorizationCode?: string;
  email?: string;
  firstName?: string;
  identityToken: string;
  lastName?: string;
  userIdentifier?: string;
};

type FriemiNavigationPlugin = {
  signInWithApple: () => Promise<NativeAppleSignInResult>;
  signInWithGoogle: () => Promise<NativeGoogleSignInResult>;
};

const FriemiNavigation = registerPlugin<FriemiNavigationPlugin>("FriemiNavigation");

type ClerkAuthMountGuardProps = {
  exitUrl: string;
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
    dividerText: "text-xs font-bold uppercase text-[#8E8383]/74",
    footer: "mt-5 bg-transparent p-0 shadow-none",
    footerAction: "justify-center p-0 text-sm text-[#8E8383]",
    footerActionLink: "font-bold text-[#156240] hover:text-[#B5301F]",
    footerActionText: "font-medium text-[#8E8383]",
    formButtonPrimary:
      "h-12 rounded-full border-0 bg-[#156240] text-sm font-bold text-white shadow-[0_18px_34px_rgba(21,98,64,0.22)] transition hover:bg-[#369758] focus:shadow-[0_0_0_4px_rgba(138,182,142,0.32)]",
    formField: "space-y-2",
    formFieldInput:
      "h-12 rounded-[1.05rem] border border-[#D6D5B2]/80 bg-[#FEFFF9]/90 px-4 text-[15px] font-semibold text-[#1D1D1B] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] outline-none transition placeholder:text-[#8E8383]/62 focus:border-[#8AB68E] focus:ring-4 focus:ring-[#8AB68E]/22",
    formFieldLabel: "text-[13px] font-bold text-[#156240]",
    formFieldRow: "space-y-2",
    formResendCodeLink: "font-bold text-[#156240]",
    form: "space-y-5",
    header: "mb-5 text-center",
    headerSubtitle: "mt-2 text-sm font-semibold text-[#156240]/68",
    headerTitle: "text-2xl font-bold tracking-normal text-[#1D1D1B]",
    identityPreview: "rounded-[1rem] border border-[#D6D5B2]/70 bg-[#FEFFF9]/80",
    main: "w-full",
    rootBox: "w-full",
    socialButtonsBlockButton:
      "h-12 rounded-full border border-[#D6D5B2]/72 bg-[#FEFFF9]/86 text-[#1D1D1B] shadow-[0_10px_26px_rgba(21,98,64,0.065)] transition hover:-translate-y-0.5 hover:border-[#8AB68E] hover:bg-white",
    socialButtonsBlockButtonText: "text-sm font-bold text-[#1D1D1B]/76",
    socialButtonsProviderIcon: "h-4 w-4",
  },
};

export function ClerkAuthMountGuard({
  exitUrl,
  fallbackRedirectUrl,
  forceRedirectUrl,
  mode,
  path,
  secondaryUrl,
  locale,
}: ClerkAuthMountGuardProps) {
  const { isLoaded: isAuthLoaded, isSignedIn } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [isFriemiIOSApp, setIsFriemiIOSApp] = useState(false);
  const [isFriemiNativeApp, setIsFriemiNativeApp] = useState(false);
  const completionStartedRef = useRef(false);

  useEffect(() => {
    const userAgent = window.navigator.userAgent;
    document.documentElement.dataset.friemiAuthPage = "true";
    setMounted(true);
    setIsFriemiIOSApp(/\bFriemiIOS\//i.test(userAgent));
    setIsFriemiNativeApp(/\bFriemi(?:Android|IOS)\//i.test(userAgent));

    return () => {
      delete document.documentElement.dataset.friemiAuthPage;
    };
  }, []);

  useEffect(() => {
    if (
      !mounted ||
      !isFriemiNativeApp ||
      !isAuthLoaded ||
      !isSignedIn ||
      completionStartedRef.current
    ) {
      return;
    }

    completionStartedRef.current = true;
    const completionTimer = window.setTimeout(() => {
      window.location.replace(forceRedirectUrl);
    }, 80);

    return () => window.clearTimeout(completionTimer);
  }, [
    forceRedirectUrl,
    isAuthLoaded,
    isFriemiNativeApp,
    isSignedIn,
    mounted,
  ]);

  const authAppearance = {
    ...sharedAuthAppearance,
    elements: {
      ...sharedAuthAppearance.elements,
      ...(mode === "sign-in" ? { header: "hidden" } : {}),
      ...(isFriemiIOSApp
        ? {
            socialButtons: "hidden",
            socialButtonsBlockButton: "hidden",
            socialButtonsBlockButtonText: "hidden",
            socialButtonsProviderIcon: "hidden",
          }
        : {}),
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

  if (isFriemiNativeApp && isAuthLoaded && isSignedIn) {
    return (
      <div className="fixed inset-0 z-[180] flex items-center justify-center bg-white px-6">
        <BrandLoader
          label={getNativeCompletionLabel(locale)}
          showLabel
          size="md"
        />
      </div>
    );
  }

  if (mode === "sign-in") {
    return (
      <div className="grid w-full min-w-0 gap-5">
        {isFriemiNativeApp ? (
          <NativeAuthExitButton exitUrl={exitUrl} locale={locale} />
        ) : null}
        {isFriemiIOSApp ? (
          <NativeIOSAuthButtons
            forceRedirectUrl={forceRedirectUrl}
            locale={locale}
            mode={mode}
          />
        ) : null}
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
      </div>
    );
  }

  return (
    <div className="grid w-full min-w-0 gap-5">
      {isFriemiNativeApp ? (
        <NativeAuthExitButton exitUrl={exitUrl} locale={locale} />
      ) : null}
      {isFriemiIOSApp ? (
        <NativeIOSAuthButtons
          forceRedirectUrl={forceRedirectUrl}
          locale={locale}
          mode={mode}
        />
      ) : null}
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
    </div>
  );
}

function NativeAuthExitButton({
  exitUrl,
  locale,
}: {
  exitUrl: string;
  locale: string;
}) {
  const label = locale.startsWith("zh")
    ? "返回 Friemi"
    : locale.startsWith("fr")
      ? "Retour a Friemi"
      : "Back to Friemi";

  return (
    <button
      aria-label={label}
      className="mb-5 inline-flex h-11 items-center gap-2 rounded-full border border-[#D6D5B2] bg-white px-4 text-sm font-bold text-[#156240] shadow-sm transition active:scale-[0.98]"
      onClick={() => window.location.replace(exitUrl)}
      type="button"
    >
      <ArrowLeft aria-hidden="true" className="h-4 w-4" strokeWidth={2.2} />
      <span>{label}</span>
    </button>
  );
}

function getNativeCompletionLabel(locale: string) {
  if (locale.startsWith("zh")) {
    return "登录成功，正在返回";
  }
  if (locale.startsWith("fr")) {
    return "Connexion reussie";
  }
  return "Signed in, returning";
}

function NativeIOSAuthButtons({
  forceRedirectUrl,
  locale,
  mode,
}: {
  forceRedirectUrl: string;
  locale: string;
  mode: "sign-in" | "sign-up";
}) {
  const { isLoaded, signIn, setActive } = useSignIn();
  const [busyProvider, setBusyProvider] = useState<NativeAuthProvider | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const copy = getNativeAuthCopy(locale, mode);

  async function handleNativeSignIn(provider: NativeAuthProvider) {
    if (!isLoaded || !signIn || !setActive || busyProvider) {
      return;
    }

    setBusyProvider(provider);
    setErrorMessage(null);

    try {
      const nativeResult =
        provider === "google"
          ? await FriemiNavigation.signInWithGoogle()
          : await FriemiNavigation.signInWithApple();
      const response = await fetch("/api/auth/native-oauth", {
        body: JSON.stringify({
          ...nativeResult,
          provider,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const payload = (await response.json()) as {
        error?: string;
        signInUrl?: string;
        ticket?: string;
      };

      if (!response.ok || !payload.ticket) {
        throw new Error(payload.error ?? copy.error);
      }

      const signInAttempt = await signIn.create({
        strategy: "ticket",
        ticket: payload.ticket,
      });

      if (signInAttempt.status === "complete" && signInAttempt.createdSessionId) {
        await setActive({ session: signInAttempt.createdSessionId });
        window.location.assign(forceRedirectUrl);
        return;
      }

      if (payload.signInUrl) {
        window.location.assign(payload.signInUrl);
        return;
      }

      throw new Error(copy.error);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : copy.error);
    } finally {
      setBusyProvider(null);
    }
  }

  return (
    <div className="mb-5 space-y-3 rounded-[1.15rem] border border-[#D6D5B2]/70 bg-[#FEFFF9]/80 p-3 shadow-[0_14px_30px_rgba(21,98,64,0.08)]">
      <p className="text-center text-[13px] font-bold text-[#156240]">
        {copy.title}
      </p>
      <div className="grid grid-cols-1 gap-2">
        <button
          className="flex h-12 items-center justify-center gap-3 rounded-full border border-[#D6D5B2]/80 bg-white text-sm font-bold text-[#1D1D1B] shadow-[0_10px_22px_rgba(21,98,64,0.08)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={Boolean(busyProvider)}
          onClick={() => void handleNativeSignIn("google")}
          type="button"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#F7F3EA] text-base font-bold text-[#4285F4]">
            G
          </span>
          <span>{busyProvider === "google" ? copy.loading : copy.google}</span>
        </button>
        <button
          className="flex h-12 items-center justify-center gap-3 rounded-full bg-[#1D1D1B] text-sm font-bold text-white shadow-[0_10px_22px_rgba(29,29,27,0.16)] transition active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
          disabled={Boolean(busyProvider)}
          onClick={() => void handleNativeSignIn("apple")}
          type="button"
        >
          <span className="text-lg leading-none"></span>
          <span>{busyProvider === "apple" ? copy.loading : copy.apple}</span>
        </button>
      </div>
      {errorMessage ? (
        <p className="rounded-[0.9rem] bg-[#FFF1EF] px-3 py-2 text-center text-xs font-bold text-[#B5301F]">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}

function getNativeAuthCopy(locale: string, mode: "sign-in" | "sign-up") {
  if (locale.startsWith("zh")) {
    return {
      apple: "使用 Apple 继续",
      error: "登录失败，请稍后再试。",
      google: "使用 Google 继续",
      loading: "正在打开...",
      title: mode === "sign-up" ? "在 App 内注册" : "在 App 内登录",
    };
  }

  if (locale.startsWith("fr")) {
    return {
      apple: "Continuer avec Apple",
      error: "La connexion a échoué. Réessayez plus tard.",
      google: "Continuer avec Google",
      loading: "Ouverture...",
      title: mode === "sign-up" ? "Inscription dans l'app" : "Connexion dans l'app",
    };
  }

  return {
    apple: "Continue with Apple",
    error: "Sign-in failed. Please try again.",
    google: "Continue with Google",
    loading: "Opening...",
    title: mode === "sign-up" ? "Sign up in app" : "Sign in in app",
  };
}
