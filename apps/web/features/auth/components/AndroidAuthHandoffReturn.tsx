"use client";

import { useSignIn } from "@clerk/nextjs";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BrandLoader } from "@/components/ui/BrandLoader";
import { getSignInHref } from "@/lib/auth-redirect";
import {
  androidAuthProofPattern,
  androidAuthStorageKey,
  normalizeAndroidAuthTarget,
  readAndroidAuthAttempt,
} from "../androidAuthFlow";

export function AndroidAuthHandoffReturn({ locale }: { locale: string }) {
  const { isLoaded, signIn, setActive } = useSignIn();
  const started = useRef(false);
  const [failed, setFailed] = useState(false);
  const copy =
    locale === "zh-CN"
      ? {
          loading: "正在完成登录",
          error: "登录已过期或不是从此 App 发起，请重新登录。",
          retry: "重新登录",
        }
      : locale === "fr"
        ? {
            loading: "Connexion en cours",
            error:
              "Connexion expirée ou démarrée ailleurs. Réessayez depuis cette app.",
            retry: "Se reconnecter",
          }
        : {
            loading: "Finishing sign-in",
            error:
              "Sign-in expired or started elsewhere. Please sign in again from this app.",
            retry: "Sign in again",
          };
  useEffect(() => {
    if (!isLoaded || !signIn || !setActive || started.current) return;
    started.current = true;
    async function finish() {
      try {
        const query = new URLSearchParams(window.location.search);
        const flow = query.get("flow") ?? "";
        const code = query.get("code") ?? "";
        // Remove the short-lived code before rendering links or navigating.
        window.history.replaceState(
          window.history.state,
          "",
          window.location.pathname,
        );
        const attempt = readAndroidAuthAttempt(
          sessionStorage.getItem(androidAuthStorageKey),
          flow,
        );
        if (!attempt || !androidAuthProofPattern.test(code))
          throw new Error("INVALID_HANDOFF");
        const response = await fetch("/api/auth/android-handoff", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            action: "redeem",
            flow,
            code,
            verifier: attempt.verifier,
          }),
        });
        if (!response.ok) throw new Error("HANDOFF_FAILED");
        const payload = (await response.json()) as {
          ticket: string;
          target: string;
        };
        if (
          payload.target !== normalizeAndroidAuthTarget(locale, attempt.target)
        )
          throw new Error("TARGET_MISMATCH");
        const result = await signIn!.create({
          strategy: "ticket",
          ticket: payload.ticket,
        });
        if (result.status !== "complete" || !result.createdSessionId)
          throw new Error("SIGN_IN_INCOMPLETE");
        await setActive!({ session: result.createdSessionId });
        sessionStorage.removeItem(androidAuthStorageKey);
        window.location.replace(payload.target);
      } catch {
        setFailed(true);
      }
    }
    void finish();
  }, [isLoaded, signIn, setActive, locale]);
  return (
    <main className="auth-page-shell flex min-h-svh items-center justify-center bg-white px-5 py-10">
      <div className="w-full max-w-sm space-y-5 text-center">
        {failed ? (
          <>
            <p role="alert" className="text-sm leading-6 text-[#B5301F]">
              {copy.error}
            </p>
            <Link
              href={getSignInHref(locale)}
              prefetch={false}
              className="inline-flex min-h-12 items-center justify-center rounded-full bg-[#156240] px-5 py-3 text-sm font-bold text-white"
            >
              {copy.retry}
            </Link>
          </>
        ) : (
          <BrandLoader label={copy.loading} showLabel size="md" />
        )}
      </div>
    </main>
  );
}
