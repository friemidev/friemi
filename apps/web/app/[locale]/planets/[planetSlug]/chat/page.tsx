import { notFound } from "next/navigation";
import { PlanetChatPage } from "@/features/planets/components/PlanetChatPage";
import { getPlanetChatPageData } from "@/features/planets/queries/planetQueries";
import { markPlanetChatRead } from "@/features/planets/services/planetChat";
import { normalizePlanetChatReturnHref } from "@/features/planets/utils/planetChatReturn";
import { getOptionalCurrentUserProfile } from "@/lib/auth";

type PlanetChatRouteProps = {
  params: Promise<{ locale: string; planetSlug: string }>;
  searchParams?: Promise<{ returnTo?: string | string[] }>;
};

export const dynamic = "force-dynamic";

export default async function PlanetChatRoute({
  params,
  searchParams,
}: PlanetChatRouteProps) {
  const { locale, planetSlug } = await params;
  const query = await searchParams;
  const profile = await getOptionalCurrentUserProfile();
  const planet = await getPlanetChatPageData(planetSlug, profile?.id ?? null);
  if (!planet) notFound();

  if (profile && planet.canViewChat) {
    await markPlanetChatRead({
      planetId: planet.id,
      profileId: profile.id,
    }).catch((error: unknown) => {
      console.error("Failed to mark planet chat read", error);
    });
  }

  return (
    <PlanetChatPage
      fallbackHref={normalizePlanetChatReturnHref(locale, query?.returnTo)}
      locale={locale}
      planet={planet}
      viewerProfileId={profile?.id ?? null}
    />
  );
}
