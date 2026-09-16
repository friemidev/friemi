import Image from "next/image";
import type { Metadata } from "next";
import { brand } from "@/lib/brand";
import { withLocale } from "@/lib/routes";
import {
  buildPageShareMetadata,
  getCanonicalMetadataBaseUrl,
} from "@/lib/share-metadata";
import { TopNewsHistoryBackButton } from "../TopNewsHistoryBackButton";

type HostRecruitmentTopNewsPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

const hostRecruitmentImages = {
  en: {
    height: 4298,
    src: "/top_news/founding-host-recruitment-en.png",
    width: 1024,
  },
  fr: {
    height: 4298,
    src: "/top_news/founding-host-recruitment-fr.png",
    width: 1024,
  },
  "zh-CN": {
    height: 2167,
    src: "/top_news/founding-host-recruitment-zh.png",
    width: 726,
  },
} as const;

function getHostRecruitmentImage(locale: string) {
  if (locale === "fr") return hostRecruitmentImages.fr;
  if (locale === "en") return hostRecruitmentImages.en;
  return hostRecruitmentImages["zh-CN"];
}

function getCopy(locale: string) {
  if (locale === "fr") {
    return {
      back: "Retour",
      description:
        "Rejoignez le programme des hôtes fondateurs Friemi et développez votre communauté.",
      title: "Devenez hôte fondateur Friemi",
    };
  }

  if (locale === "en") {
    return {
      back: "Back",
      description:
        "Join the Friemi Founding Host program and grow your community.",
      title: "Become a Friemi Founding Host",
    };
  }

  return {
    back: "返回",
    description: "加入 Friemi 共创主理人计划，让你的活动和社群被更多人发现。",
    title: "Friemi 共创主理人招募",
  };
}

export async function generateMetadata({
  params,
}: HostRecruitmentTopNewsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const copy = getCopy(locale);

  return buildPageShareMetadata({
    baseUrl: getCanonicalMetadataBaseUrl(),
    description: copy.description,
    path: withLocale(locale, "/top-news/host-recruitment"),
    title: `${copy.title} · ${brand.name}`,
  });
}

export default async function HostRecruitmentTopNewsPage({
  params,
}: HostRecruitmentTopNewsPageProps) {
  const { locale } = await params;
  const copy = getCopy(locale);
  const image = getHostRecruitmentImage(locale);

  return (
    <main className="top-news-story-page min-h-svh bg-white pb-[var(--app-bottom-safe-area)] pt-[var(--app-top-safe-area)]">
      <TopNewsHistoryBackButton
        fallbackHref={withLocale(locale, "/mobile-home")}
        label={copy.back}
      />
      <div
        className="mx-auto w-full"
        style={{ maxWidth: `${image.width}px` }}
      >
        <Image
          alt={copy.title}
          className="block h-auto w-full"
          height={image.height}
          priority
          sizes={`(max-width: ${image.width}px) 100vw, ${image.width}px`}
          src={image.src}
          width={image.width}
        />
      </div>
    </main>
  );
}
