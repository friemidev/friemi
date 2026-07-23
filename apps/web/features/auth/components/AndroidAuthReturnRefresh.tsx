"use client";

import { useAuth } from "@clerk/nextjs";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { BrandLoader } from "@/components/ui/BrandLoader";
import {
  androidAuthReturnParamName,
  androidAuthRetryParamName,
  authRedirectParamName,
} from "@/lib/auth-redirect";
import { withLocale } from "@/lib/routes";

type AndroidAuthReturnRefreshProps = {
  locale: string;
  serverAuthenticated: boolean;
};

type AuthReturnPhase = "syncing" | "retrying" | "finishing";

const authReturnCopy = {
  "zh-CN": {
    syncing: {
      title: "正在同步登录状态",
      body: "马上回到刚才的页面。",
    },
    retrying: {
      title: "正在完成登录",
      body: "不用再点一次登录，Friemi 会帮你接上。",
    },
    finishing: {
      title: "登录完成",
      body: "正在整理你的个人状态。",
    },
  },
  en: {
    syncing: {
      title: "Syncing your session",
      body: "Taking you back to where you left off.",
    },
    retrying: {
      title: "Finishing sign-in",
      body: "Friemi is reconnecting the app for you.",
    },
    finishing: {
      title: "Signed in",
      body: "Updating your app session.",
    },
  },
  fr: {
    syncing: {
      title: "Synchronisation",
      body: "Retour à la page précédente.",
    },
    retrying: {
      title: "Connexion en cours",
      body: "Friemi reconnecte l'app automatiquement.",
    },
    finishing: {
      title: "Connexion réussie",
      body: "Mise à jour de votre session.",
    },
  },
} as const;

function isFriemiAndroidWebView() {
  return /FriemiAndroid\//i.test(window.navigator.userAgent);
}

function isFriemiIOSWebView() {
  return /FriemiIOS\//i.test(window.navigator.userAgent);
}

function isFriemiNativeWebView() {
  return isFriemiAndroidWebView() || isFriemiIOSWebView();
}

function withoutAndroidAuthParams(pathname: string, searchParams: URLSearchParams) {
  const nextParams = new URLSearchParams(searchParams.toString());
  nextParams.delete(androidAuthReturnParamName);
  nextParams.delete(androidAuthRetryParamName);

  const query = nextParams.toString();
  return `${pathname}${query ? `?${query}` : ""}`;
}

function withAndroidRetryParam(target: string) {
  const url = new URL(target, window.location.origin);
  url.searchParams.set(androidAuthReturnParamName, "1");
  url.searchParams.set(androidAuthRetryParamName, "1");
  return `${url.pathname}${url.search}${url.hash}`;
}

export function AndroidAuthReturnRefresh({
  locale,
  serverAuthenticated,
}: AndroidAuthReturnRefreshProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isLoaded, isSignedIn } = useAuth();
  const [visible, setVisible] = useState(false);
  const [phase, setPhase] = useState<AuthReturnPhase>("syncing");
  const activatedAtRef = useRef<number | null>(null);
  const retryStartedRef = useRef(false);
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const isAndroidAuthReturn = searchParams.get(androidAuthReturnParamName) === "1";
  const hasRetried = searchParams.get(androidAuthRetryParamName) === "1";

  const cleanTarget = useMemo(
    () => withoutAndroidAuthParams(pathname, searchParams),
    [pathname, searchParams],
  );

  useEffect(() => {
    if (!isAndroidAuthReturn || !isFriemiNativeWebView()) {
      setVisible(false);
      activatedAtRef.current = null;
      return;
    }

    activatedAtRef.current ??= Date.now();
    setPhase("syncing");
    setVisible(true);

    const refreshTimers = [120, 650, 1500].map((delay) =>
      window.setTimeout(() => {
        router.refresh();
      }, delay),
    );

    return () => {
      refreshTimers.forEach((timer) => window.clearTimeout(timer));
    };
  }, [isAndroidAuthReturn, routeKey, router]);

  useEffect(() => {
    if (!isAndroidAuthReturn || !isFriemiNativeWebView()) {
      return;
    }

    if (serverAuthenticated || (isLoaded && isSignedIn)) {
      setPhase("finishing");
      const elapsed = Date.now() - (activatedAtRef.current ?? Date.now());
      const delay = Math.max(260, 900 - elapsed);
      const finishTimer = window.setTimeout(() => {
        window.location.replace(cleanTarget);
      }, delay);

      return () => {
        window.clearTimeout(finishTimer);
      };
    }

    if (isLoaded && !isSignedIn && hasRetried) {
      const fallbackTimer = window.setTimeout(() => {
        setVisible(false);
      }, 2400);

      return () => {
        window.clearTimeout(fallbackTimer);
      };
    }

    if (isLoaded && !isSignedIn) {
      setPhase("retrying");
    }

    if (!isLoaded || hasRetried || retryStartedRef.current) {
      return;
    }

    retryStartedRef.current = true;
    const retryTimer = window.setTimeout(() => {
      const targetWithRetry = withAndroidRetryParam(cleanTarget);
      const query = new URLSearchParams({
        [authRedirectParamName]: targetWithRetry,
      });
      window.location.replace(withLocale(locale, `/sign-in?${query.toString()}`));
    }, 950);

    return () => {
      window.clearTimeout(retryTimer);
    };
  }, [
    cleanTarget,
    hasRetried,
    isAndroidAuthReturn,
    isLoaded,
    isSignedIn,
    locale,
    router,
    serverAuthenticated,
  ]);

  if (!visible || !isAndroidAuthReturn) {
    return null;
  }

  const localeKey =
    locale === "en" || locale === "fr" || locale === "zh-CN" ? locale : "fr";
  const copy = authReturnCopy[localeKey][phase];

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-[#FEFFF9]/95 px-6 text-center backdrop-blur-[3px]"
      role="status"
      aria-live="polite"
    >
      <div className="w-full max-w-[18rem] rounded-[2rem] border border-[#D6D5B2] bg-white/88 px-6 py-7 shadow-[0_24px_80px_rgba(21,98,64,0.16)]">
        <BrandLoader label={copy.title} size="sm" />
        <p className="mt-3 text-lg font-black leading-tight text-[#0B2B66]">
          {copy.title}
        </p>
        <p className="mt-2 text-sm font-semibold leading-6 text-[#156240]/80">
          {copy.body}
        </p>
      </div>
    </div>
  );
}
