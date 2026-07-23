import type { MetadataRoute } from "next";
import type { ActivityStatus } from "@prisma/client";
import { defaultLocale, locales } from "@chill-club/shared";
import { versionUpdates } from "@/features/updates/versionUpdates";
import { getActivityDetailPath } from "@/features/activities/utils/activityRoutes";
import { prisma } from "@/lib/prisma";
import { buildCanonicalSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

const staticLocalePaths = [
  "/home",
  "/activities",
  "/lobby",
  "/co-creators",
  "/game-tools",
  "/game-tools/werewolf",
  "/game-tools/avalon",
  "/privacy",
  "/safety",
  "/updates",
] as const;

const indexableActivityStatuses: ActivityStatus[] = [
  "OPEN",
  "RECRUITING",
  "CONFIRMED",
  "FULL",
];
const activityEntryLimit = 2_000;
const publicEventEntryLimit = 1_000;
const merchantEntryLimit = 500;

type SitemapEntry = MetadataRoute.Sitemap[number];

function getLocalizedPath(locale: string, path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  return `/${locale}${normalizedPath === "/" ? "" : normalizedPath}`;
}

function getAlternates(path: string): SitemapEntry["alternates"] {
  return {
    languages: Object.fromEntries([
      ...locales.map((locale) => [
        locale,
        buildCanonicalSiteUrl(getLocalizedPath(locale, path)),
      ]),
      [
        "x-default",
        buildCanonicalSiteUrl(getLocalizedPath(defaultLocale, path)),
      ],
    ]),
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
  const latestReleaseDate = versionUpdates
    .map((update) => update.releasedAt)
    .sort()
    .at(-1);
  const staticLastModified = latestReleaseDate
    ? new Date(latestReleaseDate)
    : now;
  const [activities, publicEvents, merchants] = await Promise.all([
    prisma.activity.findMany({
      orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
      select: {
        id: true,
        updatedAt: true,
      },
      take: activityEntryLimit,
      where: {
        OR: [
          {
            endAt: {
              gte: now,
            },
          },
          {
            endAt: null,
            startAt: {
              gte: now,
            },
          },
        ],
        organizer: {
          status: "ACTIVE",
        },
        publicEventId: null,
        status: {
          in: indexableActivityStatuses,
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
      take: publicEventEntryLimit,
      where: {
        OR: [
          {
            endAt: {
              gte: now,
            },
          },
          {
            endAt: null,
            startAt: {
              gte: now,
            },
          },
        ],
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
      take: merchantEntryLimit,
      where: {
        isActive: true,
      },
    }),
  ]);

  const staticEntries = staticLocalePaths.flatMap((path) =>
    createLocalizedEntries({
      changeFrequency: path === "/home" ? "daily" : "weekly",
      lastModified: staticLastModified,
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
    ...staticEntries,
    ...updateEntries,
    ...activityEntries,
    ...publicEventEntries,
    ...merchantEntries,
  ];
}
