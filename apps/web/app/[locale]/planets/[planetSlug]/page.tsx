import { notFound } from "next/navigation";
import { PlanetRoomPage } from "@/features/planets/components/PlanetPages";
import {
  getPlanetMoment,
  getPlanetRoom,
} from "@/features/planets/queries/planetQueries";
import { getOptionalCurrentUserProfile } from "@/lib/auth";

type PlanetRoomPageProps = {
  params: Promise<{ locale: string; planetSlug: string }>;
  searchParams?: Promise<{ moment?: string | string[] }>;
};

export default async function PlanetRoomRoute({
  params,
  searchParams,
}: PlanetRoomPageProps) {
  const { locale, planetSlug } = await params;
  const query = await searchParams;
  const profile = await getOptionalCurrentUserProfile();
  const planet = await getPlanetRoom(planetSlug, profile?.id ?? null);
  if (!planet) notFound();

  const requestedMomentValue = query?.moment;
  const requestedMomentId = Array.isArray(requestedMomentValue)
    ? requestedMomentValue[0]
    : requestedMomentValue;
  const fallbackMomentId = planet.moments[0]?.id;
  const selectedMomentId = requestedMomentId || fallbackMomentId;
  let selectedMoment = selectedMomentId
    ? await getPlanetMoment(
        selectedMomentId,
        planetSlug,
        profile?.id ?? null,
      )
    : null;
  const momentUnavailable = Boolean(requestedMomentId && !selectedMoment);

  if (!selectedMoment && fallbackMomentId && fallbackMomentId !== selectedMomentId) {
    selectedMoment = await getPlanetMoment(
      fallbackMomentId,
      planetSlug,
      profile?.id ?? null,
    );
  }

  return (
    <PlanetRoomPage
      locale={locale}
      momentUnavailable={momentUnavailable}
      planet={planet}
      selectedMoment={selectedMoment}
    />
  );
}
