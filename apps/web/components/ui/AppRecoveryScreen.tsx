"use client";

import { House, RefreshCw } from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import styles from "./AppRecoveryScreen.module.css";

type RecoveryLocale = "zh-CN" | "en" | "fr";

const recoveryCopy: Record<
  RecoveryLocale,
  {
    description: string;
    home: string;
    refresh: string;
    title: string;
  }
> = {
  "zh-CN": {
    description: "可能是网络波动或页面加载异常，请刷新后重试。",
    home: "返回主页",
    refresh: "刷新页面",
    title: "页面暂时无法打开",
  },
  en: {
    description:
      "The connection may be unstable or the page failed to load. Please refresh and try again.",
    home: "Back to home",
    refresh: "Refresh",
    title: "This page is temporarily unavailable",
  },
  fr: {
    description:
      "La connexion est peut-être instable ou la page n'a pas pu se charger. Actualisez pour réessayer.",
    home: "Retour à l'accueil",
    refresh: "Actualiser",
    title: "Cette page est temporairement indisponible",
  },
};

function getRecoveryLocale(pathname: string): RecoveryLocale {
  const locale = pathname.split("/").filter(Boolean)[0];

  return locale === "en" || locale === "fr" ? locale : "zh-CN";
}

export function AppRecoveryScreen({
  fullScreen = false,
  locale: initialLocale,
  onRefresh,
}: {
  fullScreen?: boolean;
  locale?: string | null;
  onRefresh: () => void;
}) {
  const [locale, setLocale] = useState<RecoveryLocale>(() =>
    initialLocale === "en" || initialLocale === "fr" ? initialLocale : "zh-CN",
  );

  useEffect(() => {
    if (
      initialLocale === "en" ||
      initialLocale === "fr" ||
      initialLocale === "zh-CN"
    ) {
      setLocale(initialLocale);
      return;
    }

    const pathnameLocale = getRecoveryLocale(window.location.pathname);
    document.documentElement.lang = pathnameLocale;
    setLocale(pathnameLocale);
  }, [initialLocale]);

  const copy = recoveryCopy[locale];

  return (
    <main
      aria-labelledby="app-recovery-title"
      className={cn(styles.screen, fullScreen && styles.fullScreen)}
      role="alert"
    >
      <section className={styles.content}>
        <Image
          alt=""
          className={styles.illustration}
          height={224}
          priority
          src="/illustrations/ui/offline.png"
          width={224}
        />
        <h1 className={styles.title} id="app-recovery-title">
          {copy.title}
        </h1>
        <p className={styles.description}>{copy.description}</p>
        <div className={styles.actions}>
          <button
            className={cn(styles.action, styles.primaryAction)}
            onClick={onRefresh}
            type="button"
          >
            <RefreshCw aria-hidden="true" className={styles.actionIcon} />
            {copy.refresh}
          </button>
          <a
            className={cn(styles.action, styles.secondaryAction)}
            href={`/${locale}/home`}
          >
            <House aria-hidden="true" className={styles.actionIcon} />
            {copy.home}
          </a>
        </div>
      </section>
    </main>
  );
}
