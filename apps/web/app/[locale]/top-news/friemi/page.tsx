import Image from "next/image";
import type { Metadata } from "next";
import { brand } from "@/lib/brand";
import { withLocale } from "@/lib/routes";
import {
  buildPageShareMetadata,
  getCanonicalMetadataBaseUrl,
} from "@/lib/share-metadata";
import { TopNewsHistoryBackButton } from "../TopNewsHistoryBackButton";

type FriemiTopNewsPageProps = {
  params: Promise<{
    locale: string;
  }>;
};

const friemiTopNewsImages = {
  en: {
    height: 2172,
    src: "/top_news/friemi-intro-en.png",
    width: 724,
  },
  fr: {
    height: 2170,
    src: "/top_news/friemi-intro-fr.png",
    width: 725,
  },
  "zh-CN": {
    height: 2146,
    src: "/top_news/friemi-intro-zh.png",
    width: 733,
  },
} as const;

function getFriemiTopNewsImage(locale: string) {
  if (locale === "fr") return friemiTopNewsImages.fr;
  if (locale === "en") return friemiTopNewsImages.en;
  return friemiTopNewsImages["zh-CN"];
}

function getCopy(locale: string) {
  if (locale === "fr") {
    return {
      back: "Retour",
      description:
        "Découvrez Friemi pour trouver des activités, rencontrer des amis et continuer à partager après chaque sortie.",
      title: "Découvrez Friemi",
    };
  }

  if (locale === "en") {
    return {
      back: "Back",
      description:
        "Discover Friemi for finding activities, meeting friends, and staying connected after every gathering.",
      title: "Discover Friemi",
    };
  }

  return {
    back: "返回",
    description:
      "了解 Friemi 如何帮你发现活动、约朋友，并在每次相聚后继续联系。",
    title: "认识 Friemi",
  };
}

export async function generateMetadata({
  params,
}: FriemiTopNewsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const copy = getCopy(locale);

  return buildPageShareMetadata({
    baseUrl: getCanonicalMetadataBaseUrl(),
    description: copy.description,
    path: withLocale(locale, "/top-news/friemi"),
    title: `${copy.title} · ${brand.name}`,
  });
}

export default async function FriemiTopNewsPage({
  params,
}: FriemiTopNewsPageProps) {
  const { locale } = await params;
  const copy = getCopy(locale);
  const image = getFriemiTopNewsImage(locale);

  return (
    <main className="top-news-story-page min-h-svh bg-[#FEFDF9] pb-[var(--app-bottom-safe-area)] pt-[var(--app-top-safe-area)]">
      <TopNewsHistoryBackButton
        fallbackHref={withLocale(locale, "/mobile-home")}
        label={copy.back}
      />
      <div className="mx-auto w-full max-w-[733px]">
        <Image
          alt={copy.title}
          className="block h-auto w-full"
          height={image.height}
          priority
          sizes="(max-width: 733px) 100vw, 733px"
          src={image.src}
          width={image.width}
        />
      </div>
    </main>
  );
}
