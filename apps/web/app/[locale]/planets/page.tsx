import type { Metadata } from "next";
import { PlanetSquarePage } from "@/features/planets/components/PlanetPages";
import { getPlanetSquare } from "@/features/planets/queries/planetQueries";
import { getOptionalCurrentUserProfile } from "@/lib/auth";
import { canCreatePlanet } from "@/features/planets/queries/planetCreationEligibility";

type PlanetsPageProps = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: PlanetsPageProps): Promise<Metadata> {
  const { locale } = await params;
  return { title: `${locale === "en" ? "Between Planets" : locale === "fr" ? "Entre planetes" : "星际之间"} | Friemi` };
}

export default async function PlanetsPage({ params }: PlanetsPageProps) {
  const { locale } = await params;
  const profile = await getOptionalCurrentUserProfile();
  const planets = await getPlanetSquare(profile?.id ?? null);
  const canCreate = await canCreatePlanet(profile);
  return <PlanetSquarePage canCreate={canCreate} locale={locale} planets={planets} />;
}
