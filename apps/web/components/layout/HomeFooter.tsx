import Image from "next/image";
import Link from "next/link";
import { BadgeCheck, Mail, Sparkles } from "lucide-react";
import { brand } from "@/lib/brand";
import { withLocale } from "@/lib/routes";

type HomeFooterProps = {
  locale: string;
};

const footerCopy = {
  "zh-CN": {
    description: "面向海外中文用户的活动发现与组局工具。",
    contactTitle: "联系我们",
    contactEmail: "friemi.dev@gmail.com",
    coCreatorsLabel: "共创主理人",
    versionLabel: "版本号",
    updatesLabel: "更新公告",
    copyright: `© 2026 ${brand.name}`,
  },
  en: {
    description: "Find activities, bring friends, and meet people nearby.",
    contactTitle: "Contact",
    contactEmail: "friemi.dev@gmail.com",
    coCreatorsLabel: "Co-creator program",
    versionLabel: "Version",
    updatesLabel: "Release notes",
    copyright: `© 2026 ${brand.name}`,
  },
  fr: {
    description:
      "Trouvez des sorties, invitez des amis et rencontrez du monde.",
    contactTitle: "Contact",
    contactEmail: "friemi.dev@gmail.com",
    coCreatorsLabel: "Programme co-createurs",
    versionLabel: "Version",
    updatesLabel: "Notes de version",
    copyright: `© 2026 ${brand.name}`,
  },
} as const;

export function HomeFooter({ locale }: HomeFooterProps) {
  const t =
    footerCopy[locale as keyof typeof footerCopy] ?? footerCopy["zh-CN"];

  return (
    <footer className="mt-4 border-t border-black/10 bg-ink text-white">
      <div className="mx-auto grid w-full max-w-7xl gap-8 px-4 py-8 sm:px-6 md:grid-cols-[1.2fr_0.9fr_0.7fr] lg:px-8">
        <div className="space-y-4">
          <Link
            href={withLocale(locale, "/home")}
            className="inline-flex items-center gap-3"
          >
            <span className="flex h-12 w-40 shrink-0 items-center justify-start gap-3 overflow-hidden">
              <Image
                src={brand.logoIconPath}
                alt=""
                width={48}
                height={48}
                className="h-12 w-12 shrink-0 object-contain"
              />
              <Image
                src={brand.titleImagePath}
                alt={brand.name}
                width={106}
                height={36}
                className="h-auto w-24 object-contain brightness-0 invert"
              />
            </span>
            <span className="sr-only">
              {brand.name}
            </span>
          </Link>
          <p className="max-w-sm text-sm leading-6 text-white/75">
            {t.description}
          </p>
        </div>

        <div className="space-y-3">
          <h2 className="text-sm font-semibold tracking-normal text-white">
            {t.contactTitle}
          </h2>
          <div className="grid gap-2">
            <a
              className="flex min-w-0 items-center gap-2 text-sm text-white/75 transition hover:text-white"
              href={`mailto:${t.contactEmail}`}
            >
              <Mail className="h-4 w-4 shrink-0 text-clay" aria-hidden="true" />
              <span className="min-w-0 break-all">{t.contactEmail}</span>
            </a>
            <Link
              className="flex min-w-0 items-center gap-2 text-sm text-white/75 transition hover:text-white"
              href={withLocale(locale, "/co-creators")}
            >
              <BadgeCheck
                className="h-4 w-4 shrink-0 text-clay"
                aria-hidden="true"
              />
              <span className="min-w-0">{t.coCreatorsLabel}</span>
            </Link>
          </div>
        </div>

        <div className="space-y-3 md:text-right">
          <h2 className="text-sm font-semibold tracking-normal text-white">
            {t.updatesLabel}
          </h2>
          <p className="text-sm text-white/60">
            {t.versionLabel}{" "}
            <Link
              className="inline-flex whitespace-nowrap rounded-full border border-white/15 bg-white/10 px-3 py-1 font-semibold text-white transition hover:bg-white hover:text-ink"
              href={withLocale(locale, "/updates/v2_0")}
            >
              v2.0
            </Link>
          </p>
          <p className="inline-flex items-center gap-2 text-xs text-white/45 md:justify-end">
            <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
            {t.copyright}
          </p>
        </div>
      </div>
    </footer>
  );
}
