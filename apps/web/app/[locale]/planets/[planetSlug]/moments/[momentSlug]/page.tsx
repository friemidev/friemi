import { notFound } from "next/navigation";
import { PlanetMomentPage } from "@/features/planets/components/PlanetPages";
import { getPlanetMoment } from "@/features/planets/queries/planetQueries";
import { getOptionalCurrentUserProfile } from "@/lib/auth";

type PlanetMomentPageProps = { params: Promise<{ locale: string; planetSlug: string; momentSlug: string }> };

export default async function PlanetMomentRoute({ params }: PlanetMomentPageProps) {
  const { locale, planetSlug, momentSlug } = await params;
  const profile = await getOptionalCurrentUserProfile();
  const moment = await getPlanetMoment(momentSlug, planetSlug, profile?.id ?? null);
  if (!moment) notFound();
  return <PlanetMomentPage locale={locale} moment={moment} />;
}
