import { PlanetCreatePage } from "@/features/planets/components/PlanetPages";
import { redirect } from "next/navigation";
import { getOptionalCurrentUserProfile } from "@/lib/auth";
import { withLocale } from "@/lib/routes";
import { canCreatePlanet } from "@/features/planets/queries/planetCreationEligibility";

type PlanetCreatePageProps = { params: Promise<{ locale: string }> };

export default async function PlanetCreateRoute({ params }: PlanetCreatePageProps) {
  const { locale } = await params;
  const profile = await getOptionalCurrentUserProfile();
  if (!(await canCreatePlanet(profile))) {
    redirect(withLocale(locale, "/planets"));
  }
  return <PlanetCreatePage locale={locale} />;
}
