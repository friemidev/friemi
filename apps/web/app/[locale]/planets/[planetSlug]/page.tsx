import { notFound } from "next/navigation";
import { PlanetRoomPage } from "@/features/planets/components/PlanetPages";
import { getPlanetRoom } from "@/features/planets/queries/planetQueries";
import { getOptionalCurrentUserProfile } from "@/lib/auth";

type PlanetRoomPageProps = { params: Promise<{ locale: string; planetSlug: string }> };

export default async function PlanetRoomRoute({ params }: PlanetRoomPageProps) {
  const { locale, planetSlug } = await params;
  const profile = await getOptionalCurrentUserProfile();
  const planet = await getPlanetRoom(planetSlug, profile?.id ?? null);
  if (!planet) notFound();
  return <PlanetRoomPage locale={locale} planet={planet} />;
}
