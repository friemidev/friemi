import { unstable_cache } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  getFallbackMobileHomeTopNewsItems,
  type MobileHomeTopNewsItem,
} from "@/features/home/topNewsConfig";

export type { MobileHomeTopNewsItem } from "@/features/home/topNewsConfig";

export const mobileHomeTopNewsCacheTag = "mobile-home-top-news";

type TopNewsRow = {
  href: string;
  id: string;
  imageUrl: string;
  isActive: boolean;
  titleEn: string;
  titleFr: string;
  titleZh: string;
};

function getLocalizedTopNewsTitle(row: TopNewsRow, locale: string) {
  if (locale === "fr") {
    return row.titleFr;
  }

  if (locale === "en") {
    return row.titleEn;
  }

  return row.titleZh;
}

function mapTopNewsRow(row: TopNewsRow, locale: string): MobileHomeTopNewsItem {
  return {
    href: row.href,
    id: row.id,
    image: row.imageUrl,
    title: getLocalizedTopNewsTitle(row, locale),
  };
}

const getCachedTopNewsRows = unstable_cache(
  async () =>
    prisma.topNewsItem.findMany({
      orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }, { id: "asc" }],
      take: 12,
      select: {
        href: true,
        id: true,
        imageUrl: true,
        isActive: true,
        titleEn: true,
        titleFr: true,
        titleZh: true,
      },
    }),
  ["mobile-home-top-news-active"],
  {
    revalidate: 60,
    tags: [mobileHomeTopNewsCacheTag],
  },
);

export async function getMobileHomeTopNewsItems(locale: string) {
  try {
    const rows = await getCachedTopNewsRows();

    if (rows.length > 0) {
      return rows
        .filter((row) => row.isActive)
        .slice(0, 8)
        .map((row) => mapTopNewsRow(row, locale));
    }
  } catch (error) {
    console.error("Failed to load mobile home top news", error);
  }

  return getFallbackMobileHomeTopNewsItems(locale);
}
