import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Orbit } from "lucide-react";
import { joinPlanetByInviteAction } from "@/features/planets/actions/planetActions";
import { getOptionalLayoutViewerState } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { withLocale } from "@/lib/routes";

type PlanetInvitePageProps = {
  params: Promise<{ inviteCode: string; locale: string }>;
};

const copy = {
  "zh-CN": {
    title: "星球邀请",
    body: "你收到了一个星球邀请。提交申请后，需要创建人审核通过，才能正式加入并看到群聊。",
    action: "申请加入星球",
    pending: "申请已提交，等待审核",
    view: "查看星球",
  },
  en: {
    title: "Planet invite",
    body: "You received a planet invite. After you send the request, the creator must approve it before you can join and view the chat.",
    action: "Request to join",
    pending: "Request sent. Awaiting approval.",
    view: "View planet",
  },
  fr: {
    title: "Invitation planète",
    body: "Vous avez reçu une invitation. Après votre demande, le créateur doit l'approuver avant que vous puissiez rejoindre et voir le chat.",
    action: "Demander à rejoindre",
    pending: "Demande envoyée. En attente d'approbation.",
    view: "Voir la planète",
  },
} as const;

export default async function PlanetInvitePage({
  params,
}: PlanetInvitePageProps) {
  const { inviteCode, locale } = await params;
  const t = locale === "en" || locale === "fr" ? copy[locale] : copy["zh-CN"];
  const planet = await prisma.planet.findUnique({
    where: { inviteCode: inviteCode.trim().toUpperCase() },
    select: {
      id: true,
      slug: true,
      name: true,
      nameTranslations: true,
      coverImageUrl: true,
    },
  });
  if (!planet) notFound();
  const { profile } = await getOptionalLayoutViewerState();
  const membership = profile
    ? await prisma.planetMember.findUnique({
        where: {
          planetId_profileId: { planetId: planet.id, profileId: profile.id },
        },
        select: { status: true },
      })
    : null;
  const planetHref = withLocale(locale, `/planets/${planet.slug}`);
  if (membership?.status === "APPROVED") redirect(planetHref);
  const translations = planet.nameTranslations;
  const translatedName =
    translations &&
    typeof translations === "object" &&
    !Array.isArray(translations)
      ? translations[locale]
      : null;
  const name =
    typeof translatedName === "string" && translatedName.trim()
      ? translatedName
      : planet.name;

  return (
    <main className="flex min-h-[100svh] items-center justify-center bg-white px-5 py-10 text-ink">
      <section className="w-full max-w-sm text-center">
        {planet.coverImageUrl ? (
          <img
            alt=""
            className="mx-auto h-24 w-24 rounded-lg object-cover"
            height={96}
            src={planet.coverImageUrl}
            width={96}
          />
        ) : (
          <Orbit aria-hidden="true" className="mx-auto h-12 w-12 text-forest" />
        )}
        <p className="mt-4 text-sm font-semibold text-forest">{t.title}</p>
        <h1 className="mt-2 break-words text-2xl font-bold">{name}</h1>
        <p className="mt-3 text-sm leading-6 text-ink/70">
          {membership?.status === "PENDING" ? t.pending : t.body}
        </p>
        {membership?.status === "PENDING" ? (
          <Link
            className="mt-6 flex min-h-11 items-center justify-center rounded-full bg-forest px-4 font-bold text-white"
            href={planetHref}
          >
            {t.view}
          </Link>
        ) : (
          <form action={joinPlanetByInviteAction} className="mt-6">
            <input name="locale" type="hidden" value={locale} />
            <input name="inviteCode" type="hidden" value={inviteCode} />
            <button className="min-h-11 w-full rounded-full bg-forest px-4 py-3 font-bold text-white">
              {t.action}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}
