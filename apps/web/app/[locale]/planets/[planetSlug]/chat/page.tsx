import { Suspense } from "react";
import { notFound } from "next/navigation";
import { PlanetChatPage } from "@/features/planets/components/PlanetChatPage";
import { getPlanetChatPageData } from "@/features/planets/queries/planetQueries";
import { ChatReadReceipt } from "@/features/chat/components/ChatReadReceipt";
import { normalizePlanetChatReturnHref } from "@/features/planets/utils/planetChatReturn";
import { getOptionalCurrentUserProfileSnapshot } from "@/lib/auth";

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
  const profile = await getOptionalCurrentUserProfileSnapshot();
  const planet = await getPlanetChatPageData(planetSlug, profile?.id ?? null);
  if (!planet) notFound();

  return (
    <>
      {profile && planet.canViewChat ? (
        <Suspense fallback={null}>
          <ChatReadReceipt
            scope="planet"
            subjectId={planet.id}
            profileId={profile.id}
          />
        </Suspense>
      ) : null}
      <PlanetChatPage
        fallbackHref={normalizePlanetChatReturnHref(locale, query?.returnTo)}
        locale={locale}
        planet={planet}
        viewerProfileId={profile?.id ?? null}
      />
    </>
  );
}
