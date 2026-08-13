import { notFound, redirect } from "next/navigation";
import { getPlanetMomentRedirectTarget } from "@/features/planets/queries/planetQueries";
import { buildPlanetMomentRedirectHref } from "@/features/planets/utils/planetMomentRoute";
import { getOptionalCurrentUserProfile } from "@/lib/auth";

type PlanetMomentPageProps = { params: Promise<{ locale: string; planetSlug: string; momentSlug: string }> };

export default async function PlanetMomentRoute({ params }: PlanetMomentPageProps) {
  const { locale, planetSlug, momentSlug } = await params;
  const profile = await getOptionalCurrentUserProfile();
  const moment = await getPlanetMomentRedirectTarget(
    momentSlug,
    planetSlug,
    profile?.id ?? null,
  );
  if (!moment) notFound();
  redirect(buildPlanetMomentRedirectHref({ locale, momentId: moment.id, planetSlug }));
}
