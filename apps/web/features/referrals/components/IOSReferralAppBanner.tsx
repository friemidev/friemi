import Image from "next/image";
import { Download } from "lucide-react";
import { IOS_APP_STORE_URL } from "@/features/mobile/iosAppStore";
import { brand } from "@/lib/brand";
import { cn } from "@/lib/utils";

type IOSReferralAppBannerProps = {
  className?: string;
  locale: string;
};

const copy = {
  "zh-CN": {
    action: "App Store 下载",
    description: "打开 App，登录后即可接受好友邀请。",
    title: "在 Friemi App 中继续",
  },
  en: {
    action: "Get the app",
    description: "Open the app and sign in to accept your friend invite.",
    title: "Continue in Friemi",
  },
  fr: {
    action: "Télécharger",
    description: "Ouvrez l'app et connectez-vous pour accepter l'invitation.",
    title: "Continuer dans Friemi",
  },
} as const;

export function IOSReferralAppBanner({
  className,
  locale,
}: IOSReferralAppBannerProps) {
  const text = copy[locale as keyof typeof copy] ?? copy.en;

  return (
    <aside
      aria-label={text.title}
      className={cn(
        "border-b border-[#D6D5B2] bg-[#F1F2E3] text-[#111210]",
        className,
      )}
    >
      <div className="mx-auto flex min-h-[4.5rem] w-full max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6 lg:px-8">
        <Image
          alt="Friemi"
          className="h-11 w-11 shrink-0 rounded-lg object-cover shadow-sm"
          height={44}
          priority
          src={brand.appleIconPath}
          width={44}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold leading-5">{text.title}</p>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-4 text-[#43524B] sm:text-xs">
            {text.description}
          </p>
        </div>
        <a
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-[#126B49] px-3 text-[12px] font-bold text-white shadow-sm transition active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#126B49]/45 focus-visible:ring-offset-2"
          href={IOS_APP_STORE_URL}
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          <span>{text.action}</span>
        </a>
      </div>
    </aside>
  );
}
