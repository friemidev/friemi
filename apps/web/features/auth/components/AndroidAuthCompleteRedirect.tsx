"use client";

import Link from "next/link";
import { useEffect, useMemo } from "react";

type AndroidAuthCompleteRedirectProps = {
  locale: string;
  target: string;
};

export function AndroidAuthCompleteRedirect({
  locale,
  target,
}: AndroidAuthCompleteRedirectProps) {
  const appHref = useMemo(() => {
    const query = new URLSearchParams({ target });
    return `friemi://auth-complete?${query.toString()}`;
  }, [target]);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      window.location.replace(appHref);
    }, 120);

    return () => window.clearTimeout(timeout);
  }, [appHref]);

  const copy =
    locale === "zh-CN"
      ? {
          title: "正在回到 Friemi",
          body: "登录已完成，正在带你回到 App。",
          openApp: "回到 App",
          browser: "继续网页版",
        }
      : locale === "fr"
        ? {
            title: "Retour vers Friemi",
            body: "Connexion terminée. Retour à l'application.",
            openApp: "Ouvrir l'app",
            browser: "Continuer sur le web",
          }
        : {
            title: "Returning to Friemi",
            body: "Sign-in is complete. Taking you back to the app.",
            openApp: "Open app",
            browser: "Continue on web",
          };

  return (
    <main className="flex min-h-[100svh] items-center justify-center bg-[#FEFFF9] px-5 py-8">
      <section className="w-full max-w-sm rounded-[2rem] border border-[#D6D5B2] bg-white/85 p-6 text-center shadow-[0_24px_70px_rgba(21,98,64,0.14)]">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-[#156240] text-xl font-black text-white">
          F
        </div>
        <h1 className="mt-5 text-xl font-black text-[#0B2B66]">
          {copy.title}
        </h1>
        <p className="mt-2 text-sm font-medium leading-6 text-[#156240]">
          {copy.body}
        </p>
        <div className="mt-6 grid gap-3">
          <a
            className="inline-flex h-12 items-center justify-center rounded-full bg-[#156240] px-5 text-sm font-black text-white"
            href={appHref}
          >
            {copy.openApp}
          </a>
          <Link
            className="inline-flex h-11 items-center justify-center rounded-full border border-[#D6D5B2] bg-[#FEFFF9] px-5 text-sm font-bold text-[#156240]"
            href={target}
          >
            {copy.browser}
          </Link>
        </div>
      </section>
    </main>
  );
}
