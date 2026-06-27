"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Check, Copy } from "lucide-react";
import { Button } from "@chill-club/ui";
import { BrandBackdrop } from "@/components/brand/BrandBackdrop";
import { BrandLockup } from "@/components/brand/BrandLockup";
import { trackClientAnalyticsEvent } from "@/features/analytics/client";
import { cn } from "@/lib/utils";

type WechatWebViewGuideProps = {
  locale: string;
};

type GuideCopy = {
  eyebrow: string;
  title: string;
  description: string;
  arrowHint: string;
  steps: string[];
  fallback: string;
  copyLink: string;
  copied: string;
};

function getGuideCopy(locale: string): GuideCopy {
  if (locale === "fr") {
    return {
      eyebrow: "Ouvert dans WeChat",
      title: "Continuez dans le navigateur",
      description:
        "La connexion Google doit se terminer dans le navigateur de votre téléphone.",
      arrowHint: "Menu",
      steps: [
        "Touchez le menu ··· en haut à droite.",
        "Choisissez Ouvrir dans le navigateur.",
      ],
      fallback: "Si l'option n'apparaît pas, copiez le lien.",
      copyLink: "Copier le lien",
      copied: "Lien copié",
    };
  }

  if (locale === "en") {
    return {
      eyebrow: "Opened in WeChat",
      title: "Continue in your browser",
      description:
        "Google sign-in needs to finish in your phone browser.",
      arrowHint: "Menu",
      steps: [
        "Tap the top-right ··· menu.",
        "Choose Open in browser.",
      ],
      fallback: "If you do not see that option, copy this link.",
      copyLink: "Copy link",
      copied: "Link copied",
    };
  }

  return {
    eyebrow: "微信内打开",
    title: "用浏览器继续登录",
    description: "Google 登录需要在手机浏览器中完成。",
    arrowHint: "菜单",
    steps: ["点击右上角 ··· 菜单。", "选择「在浏览器中打开」。"],
    fallback: "找不到入口时，可以复制链接。",
    copyLink: "复制链接",
    copied: "链接已复制",
  };
}

async function copyCurrentUrl() {
  const url = window.location.href;

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(url);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = url;
  textArea.setAttribute("readonly", "true");
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.select();
  document.execCommand("copy");
  document.body.removeChild(textArea);
}

export function WechatWebViewGuide({ locale }: WechatWebViewGuideProps) {
  const copy = getGuideCopy(locale);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    trackClientAnalyticsEvent({
      name: "wechat_webview_login_guide_viewed",
      sourceSurface: "wechat_webview",
      properties: {
        context: "sign_in",
      },
    });
  }, []);

  async function handleCopy() {
    await copyCurrentUrl();
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className="fixed inset-0 z-[100] overflow-y-auto bg-[linear-gradient(165deg,#FEFFF9_0%,#F1F2E3_52%,#FFF5E6_100%)] px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
      <BrandBackdrop
        className="-right-56 top-28 h-[29rem] w-[19rem] opacity-20"
        imageClassName="object-contain object-top"
        variant="mobile-frame"
      />
      <div className="pointer-events-none fixed right-10 top-3 z-20 flex flex-col items-end text-forest">
        <ArrowUpRight className="h-8 w-8 drop-shadow-sm" />
        <span className="-mt-1 rounded-full bg-white/92 px-2.5 py-1 text-xs font-semibold shadow-[0_8px_18px_rgba(21,98,64,0.12)] ring-1 ring-sage/55">
          {copy.arrowHint}
        </span>
      </div>

      <div className="relative z-10 mx-auto flex min-h-[calc(100svh-2rem)] w-full max-w-[22rem] flex-col py-8">
        <div className="space-y-6 pt-[min(10svh,5.5rem)]">
          <div className="relative z-10 flex items-center gap-3">
            <BrandLockup size="lg" />
          </div>

          <header className="relative z-10 space-y-3 pr-14">
            <p className="text-xs font-bold uppercase tracking-[0.12em] text-forest">
              {copy.eyebrow}
            </p>
            <h1 className="text-[1.75rem] font-semibold leading-[1.08] tracking-normal text-ink">
              {copy.title}
            </h1>
            <p className="max-w-[17rem] text-sm leading-6 text-forest/78">
              {copy.description}
            </p>
          </header>

          <div className="relative z-10 overflow-hidden rounded-[1.35rem] border border-sage/45 bg-white/90 p-2 shadow-[0_18px_38px_rgba(21,98,64,0.08)] backdrop-blur">
            {copy.steps.map((step, index) => (
              <div
                key={step}
                className="grid grid-cols-[2rem_minmax(0,1fr)] items-center gap-2 rounded-[1rem] px-2.5 py-3"
              >
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white shadow-[0_8px_16px_rgba(29,29,27,0.16)]">
                  {index + 1}
                </span>
                <p className="text-sm font-medium leading-5 text-ink/82">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 mt-auto space-y-3 pt-10">
          <p className="rounded-2xl bg-white/72 px-3.5 py-3 text-xs font-medium leading-5 text-forest ring-1 ring-sage/35">
            {copy.fallback}
          </p>
          <Button
            type="button"
            onClick={handleCopy}
            className={cn(
              "h-12 w-full gap-2 rounded-full bg-ink text-sm font-semibold text-white shadow-[0_14px_30px_rgba(29,29,27,0.18)] hover:bg-ink/90",
              copied ? "bg-forest hover:bg-forest" : null,
            )}
          >
            {copied ? (
              <Check className="h-4 w-4" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
            {copied ? copy.copied : copy.copyLink}
          </Button>
        </div>
      </div>
    </section>
  );
}
