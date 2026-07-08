import type { MetadataRoute } from "next";
import type { ActivityStatus } from "@prisma/client";
import { locales } from "@chill-club/shared";
import { versionUpdates } from "@/features/updates/versionUpdates";
import { getActivityDetailPath } from "@/features/activities/utils/activityRoutes";
import { prisma } from "@/lib/prisma";
import { buildCanonicalSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

const staticLocalePaths = [
  "/home",
  "/mobile-home",
  "/activities",
  "/lobby",
  "/public-events",
  "/co-creators",
  "/updates",
] as const;

const publicActivityStatuses: ActivityStatus[] = [
  "OPEN",
  "RECRUITING",
  "CONFIRMED",
  "FULL",
  "ENDED",
];
const dynamicEntryLimit = 20_000;

type SitemapEntry = MetadataRoute.Sitemap[number];

function getLocalizedPath(locale: string, path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `/${locale}${normalizedPath === "/" ? "" : normalizedPath}`;
}

function getAlternates(path: string): SitemapEntry["alternates"] {
  return {
    languages: Object.fromEntries(
      locales.map((locale) => [
        locale,
        buildCanonicalSiteUrl(getLocalizedPath(locale, path)),
      ]),
    ),
  };
}

function createLocalizedEntries({
  changeFrequency,
  lastModified,
  path,
  priority,
}: {
  changeFrequency: NonNullable<SitemapEntry["changeFrequency"]>;
  lastModified?: Date | string;
  path: string;
  priority: number;
}): SitemapEntry[] {
  const alternates = getAlternates(path);

  return locales.map((locale) => ({
    alternates,
    changeFrequency,
    lastModified,
    priority,
    url: buildCanonicalSiteUrl(getLocalizedPath(locale, path)),
  }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [activities, publicEvents, merchants] = await Promise.all([
    prisma.activity.findMany({
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      select: {
        id: true,
        updatedAt: true,
      },
      take: dynamicEntryLimit,
      where: {
        organizer: {
          status: "ACTIVE",
        },
        status: {
          in: publicActivityStatuses,
        },
        visibility: "PUBLIC",
      },
    }),
    prisma.publicEvent.findMany({
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      select: {
        id: true,
        updatedAt: true,
      },
      take: dynamicEntryLimit,
      where: {
        status: "SCHEDULED",
        visibility: "PUBLIC",
      },
    }),
    prisma.merchant.findMany({
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      select: {
        slug: true,
        updatedAt: true,
      },
      take: 5000,
      where: {
        isActive: true,
      },
    }),
  ]);

  const staticEntries = staticLocalePaths.flatMap((path) =>
    createLocalizedEntries({
      changeFrequency: path === "/home" ? "daily" : "weekly",
      lastModified: now,
      path,
      priority: path === "/home" ? 1 : 0.72,
    }),
  );
  const updateEntries = versionUpdates.flatMap((update) =>
    createLocalizedEntries({
      changeFrequency: "monthly",
      lastModified: update.releasedAt,
      path: `/updates/${update.slug}`,
      priority: 0.52,
    }),
  );
  const activityEntries = activities.flatMap((activity) =>
    createLocalizedEntries({
      changeFrequency: "daily",
      lastModified: activity.updatedAt,
      path: getActivityDetailPath(activity.id),
      priority: 0.82,
    }),
  );
  const publicEventEntries = publicEvents.flatMap((publicEvent) =>
    createLocalizedEntries({
      changeFrequency: "daily",
      lastModified: publicEvent.updatedAt,
      path: `/public-events/${publicEvent.id}`,
      priority: 0.78,
    }),
  );
  const merchantEntries = merchants.flatMap((merchant) =>
    createLocalizedEntries({
      changeFrequency: "weekly",
      lastModified: merchant.updatedAt,
      path: `/merchants/${merchant.slug}`,
      priority: 0.58,
    }),
  );

  return [
    {
      changeFrequency: "daily",
      lastModified: now,
      priority: 1,
      url: buildCanonicalSiteUrl("/"),
    },
    ...staticEntries,
    ...updateEntries,
    ...activityEntries,
    ...publicEventEntries,
    ...merchantEntries,
  ];
}
