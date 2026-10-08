"use client";

import Link from "next/link";
import { LogIn, Smartphone } from "lucide-react";
import { useState } from "react";

export function AndroidAuthBrowserComplete({
  locale,
  flow,
  challenge,
  target,
  account,
}: {
  locale: string;
  flow: string;
  challenge: string;
  target: string;
  account: string;
}) {
  const [busy, setBusy] = useState(false);
  const [appHref, setAppHref] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const copy =
    locale === "zh-CN"
      ? {
          title: "登录 Friemi App",
          confirm: "确认并返回 App",
          open: "返回 App",
          cancel: "取消",
          error: "登录未完成，请重新从 App 发起登录。",
        }
      : locale === "fr"
        ? {
            title: "Connexion à l'app Friemi",
            confirm: "Confirmer et ouvrir l'app",
            open: "Ouvrir l'app",
            cancel: "Annuler",
            error: "Connexion incomplète. Réessayez depuis l'app.",
          }
        : {
            title: "Sign in to the Friemi app",
            confirm: "Confirm and open app",
            open: "Open app",
            cancel: "Cancel",
            error: "Sign-in is incomplete. Please start again from the app.",
          };
  async function confirm() {
    if (busy) return;
    setBusy(true);
    setFailed(false);
    try {
      const response = await fetch("/api/auth/android-handoff", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          action: "issue",
          flow,
          challenge,
          target,
          locale,
        }),
      });
      if (!response.ok) throw new Error("HANDOFF_FAILED");
      const payload = (await response.json()) as { code: string };
      const returnPath = `/${locale}/android-auth-return?${new URLSearchParams({ flow, code: payload.code })}`;
      const href = `friemi://auth-complete?${new URLSearchParams({ target: returnPath })}`;
      setAppHref(href);
      window.location.assign(href);
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="auth-page-shell flex min-h-svh items-center justify-center bg-white px-5 py-10">
      <div className="w-full max-w-sm space-y-5 text-center">
        <Smartphone aria-hidden size={32} className="mx-auto text-[#156240]" />
        <h1 className="text-xl font-bold text-[#1D1D1B]">{copy.title}</h1>
        <p className="break-words text-sm font-semibold text-[#156240]">
          {account}
        </p>
        {appHref ? (
          <a
            href={appHref}
            className="flex min-h-12 items-center justify-center gap-2 rounded-full bg-[#156240] px-5 py-3 text-sm font-bold text-white"
          >
            <Smartphone aria-hidden size={18} />
            {copy.open}
          </a>
        ) : (
          <button
            type="button"
            disabled={busy}
            onClick={() => void confirm()}
            className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#156240] px-5 py-3 text-sm font-bold text-white disabled:opacity-60"
          >
            <LogIn aria-hidden size={18} />
            {copy.confirm}
          </button>
        )}
        {failed ? (
          <p role="alert" className="text-sm text-[#B5301F]">
            {copy.error}
          </p>
        ) : null}
        <Link
          href={`/${locale}/home`}
          prefetch={false}
          className="inline-flex min-h-11 items-center px-4 text-sm text-[#156240]"
        >
          {copy.cancel}
        </Link>
      </div>
    </main>
  );
}
