"use client";

import { LogIn, RotateCcw } from "lucide-react";
import { useState } from "react";
import {
  androidAuthStorageKey,
  getAndroidAccountPortalUrl,
  normalizeAndroidAuthTarget,
} from "../androidAuthFlow";

function base64url(bytes: Uint8Array) {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function AndroidBrowserSignIn({
  locale,
  mode,
  target,
}: {
  locale: string;
  mode: "sign-in" | "sign-up";
  target: string;
}) {
  const [waiting, setWaiting] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const copy =
    locale === "zh-CN"
      ? {
          signIn: "登录 Friemi",
          signUp: "注册 Friemi",
          waiting: "正在等待登录",
          retry: "重新登录",
          error: "无法打开登录，请重试。",
        }
      : locale === "fr"
        ? {
            signIn: "Se connecter à Friemi",
            signUp: "S'inscrire sur Friemi",
            waiting: "Connexion en attente",
            retry: "Réessayer",
            error: "Impossible de démarrer la connexion. Réessayez.",
          }
        : {
            signIn: "Sign in to Friemi",
            signUp: "Sign up for Friemi",
            waiting: "Waiting for sign-in",
            retry: "Try again",
            error: "Unable to start sign-in. Please try again.",
          };
  async function start() {
    if (busy) return;
    setBusy(true);
    setError(false);
    try {
      const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)));
      const flow = [...crypto.getRandomValues(new Uint8Array(16))]
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
      const challenge = base64url(
        new Uint8Array(
          await crypto.subtle.digest(
            "SHA-256",
            new TextEncoder().encode(verifier),
          ),
        ),
      );
      const safeTarget = normalizeAndroidAuthTarget(locale, target);
      const completion = new URL(
        `/${locale}/android-auth-browser`,
        window.location.origin,
      );
      completion.search = new URLSearchParams({
        flow,
        challenge,
        target: safeTarget,
      }).toString();
      const url = getAndroidAccountPortalUrl(
        process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "",
        mode,
      );
      if (url.origin === window.location.origin)
        throw new Error("EXTERNAL_LOGIN_REQUIRED");
      url.searchParams.set("redirect_url", completion.toString());
      sessionStorage.setItem(
        androidAuthStorageKey,
        JSON.stringify({
          flow,
          verifier,
          target: safeTarget,
          createdAt: Date.now(),
        }),
      );
      setWaiting(true);
      // Start at Clerk's portal, not at Google's mid-flow authorization URL.
      // Existing Android builds open this non-app host in the external browser.
      if (window.FriemiAndroid?.openExternal)
        window.FriemiAndroid.openExternal(url.toString());
      else window.location.assign(url.toString());
    } catch {
      setError(true);
      setWaiting(false);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="space-y-4">
      {waiting ? (
        <p className="text-center text-sm text-[#156240]" role="status">
          {copy.waiting}
        </p>
      ) : null}
      <button
        type="button"
        disabled={busy}
        onClick={() => void start()}
        className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#156240] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
      >
        {waiting ? (
          <RotateCcw size={18} aria-hidden />
        ) : (
          <LogIn size={18} aria-hidden />
        )}
        {waiting ? copy.retry : mode === "sign-up" ? copy.signUp : copy.signIn}
      </button>
      {error ? (
        <p role="alert" className="text-center text-sm text-[#B5301F]">
          {copy.error}
        </p>
      ) : null}
    </div>
  );
}
