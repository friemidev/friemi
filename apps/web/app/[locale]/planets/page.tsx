import type { Metadata } from "next";
import { PlanetSquarePage } from "@/features/planets/components/PlanetPages";
import { getPlanetSquare } from "@/features/planets/queries/planetQueries";
import { getOptionalCurrentUserProfile } from "@/lib/auth";
import { canCreatePlanet } from "@/features/planets/queries/planetCreationEligibility";
import { withLocale } from "@/lib/routes";
import {
  buildPageShareMetadata,
  getCanonicalMetadataBaseUrl,
  getGeneralPageShareDescription,
} from "@/lib/share-metadata";

type PlanetsPageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({
  params,
}: PlanetsPageProps): Promise<Metadata> {
  const { locale } = await params;
  const title =
    locale === "en"
      ? "Planets"
      : locale === "fr"
        ? "Planètes"
        : "星球";

  return buildPageShareMetadata({
    baseUrl: getCanonicalMetadataBaseUrl(),
    description: getGeneralPageShareDescription(locale),
    path: withLocale(locale, "/planets"),
    title: `${title} · Friemi`,
  });
}

export default async function PlanetsPage({ params }: PlanetsPageProps) {
  const { locale } = await params;
  const profile = await getOptionalCurrentUserProfile();
  const planets = await getPlanetSquare(profile?.id ?? null);
  const canCreate = await canCreatePlanet(profile);
  return <PlanetSquarePage canCreate={canCreate} locale={locale} planets={planets} />;
}
