"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, Check, Copy } from "lucide-react";
import { Button } from "@chill-club/ui";
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
      eyebrow: "Connexion",
      title: "Continuez dans le navigateur",
      description:
        "La connexion Google se termine mieux dans votre navigateur mobile.",
      arrowHint: "Touchez ici",
      steps: ["Ouvrez le menu en haut a droite.", "Ouvrir dans le navigateur."],
      fallback: "Sinon, copiez le lien dans votre navigateur mobile.",
      copyLink: "Copier",
      copied: "Lien copie",
    };
  }

  if (locale === "en") {
    return {
      eyebrow: "Sign in",
      title: "Continue in your browser",
      description: "Google sign-in works best in your phone browser.",
      arrowHint: "Tap here",
      steps: ["Open the top-right menu.", "Choose Open in browser."],
      fallback: "Or copy this link into your phone browser.",
      copyLink: "Copy",
      copied: "Link copied",
    };
  }

  return {
    eyebrow: "微信内打开",
    title: "用浏览器继续登录",
    description: "Google 登录建议在手机浏览器中完成。",
    arrowHint: "点这里",
    steps: ["打开右上角菜单。", "选择「在浏览器中打开」。"],
    fallback: "找不到入口时，复制链接到手机浏览器。",
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
    <section className="fixed inset-0 z-[100] overflow-y-auto bg-[#f7f2e8] px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
      <div className="pointer-events-none fixed right-3 top-2 flex flex-col items-end text-moss">
        <ArrowUpRight className="h-9 w-9 drop-shadow-sm" />
        <span className="rounded-full bg-white/90 px-2 py-0.5 text-xs font-medium shadow-sm ring-1 ring-black/10">
          {copy.arrowHint}
        </span>
      </div>

      <div className="mx-auto flex min-h-[calc(100svh-2rem)] w-full max-w-xs flex-col py-8">
        <div className="space-y-6 pt-[7svh]">
          <img
            src="/logo-icon.png"
            alt="Next Fun"
            className="h-20 w-20 rounded-full border border-black/10 bg-white object-cover shadow-sm"
          />

          <header className="space-y-3 pr-12">
            <p className="text-xs font-medium text-moss">{copy.eyebrow}</p>
            <h1 className="text-2xl font-semibold leading-tight tracking-normal text-ink">
              {copy.title}
            </h1>
            <p className="text-sm leading-5 text-zinc-600">
              {copy.description}
            </p>
          </header>

          <div className="space-y-2">
            {copy.steps.map((step, index) => (
              <div
                key={step}
                className="grid grid-cols-[1.5rem_minmax(0,1fr)] gap-2 rounded-lg border border-black/10 bg-[#faf8f1] p-2.5"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-ink text-xs font-semibold text-white">
                  {index + 1}
                </span>
                <p className="self-center text-sm leading-5 text-zinc-700">
                  {step}
                </p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-auto space-y-3 pt-8">
          <p className="rounded-lg bg-[#eef4ef] px-3 py-2 text-xs leading-5 text-moss">
            {copy.fallback}
          </p>
          <Button
            type="button"
            onClick={handleCopy}
            className={cn(
              "h-11 w-full gap-2 rounded-full",
              copied ? "bg-moss hover:bg-moss" : null,
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
