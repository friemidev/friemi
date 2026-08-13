import { withLocale } from "@/lib/routes";

export function buildPlanetMomentRedirectHref({
  locale,
  momentId,
  planetSlug,
}: {
  locale: string;
  momentId: string;
  planetSlug: string;
}) {
  const planetHref = withLocale(
    locale,
    `/planets/${encodeURIComponent(planetSlug)}`,
  );

  return `${planetHref}?moment=${encodeURIComponent(momentId)}#planet-moment`;
}
