import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarDays, MapPin, Ticket } from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { NewActivityForm } from "@/features/activities/components/NewActivityForm";
import {
  formatParisDateTimeInput,
  type ActivityFormValues,
} from "@/features/activities/actions/activityActionUtils";
import { getPublicEventCopy } from "@/features/public-events/copy";
import {
  getEventDateLabel,
  getEventPriceLabel,
} from "@/features/public-events/components/PublicEventCard";
import { getPublicEventById } from "@/features/public-events/queries/getPublicEvents";
import { requireUser } from "@/lib/auth";
import { withLocale } from "@/lib/routes";

type NewPublicEventTeamPageProps = {
  params: Promise<{
    locale: string;
    publicEventId: string;
  }>;
};

export const dynamic = "force-dynamic";

function getTeamDescriptionPlaceholder(locale: string, title: string) {
  if (locale === "fr") {
    return `Je cherche des personnes pour aller à « ${title} ». Je peux préciser ici le point de rendez-vous, l'heure et le style de sortie.`;
  }

  if (locale === "en") {
    return `I am looking for people to go to "${title}" together. I can add meetup details, timing, and notes here.`;
  }

  return `我想找人一起去「${title}」，可以在这里补充集合方式、时间安排和同行备注。`;
}

function getInitialValues(
  publicEvent: {
    id: string;
    title: string;
    description: string;
    category: string;
    city: string;
    address: string;
    latitude: number | null;
    longitude: number | null;
    startAt: string;
    endAt: string | null;
    priceType: string;
    priceText: string | null;
    coverImageUrl: string | null;
    ticketUrl: string | null;
    ticketLabel: string | null;
  },
  locale: string,
): ActivityFormValues {
  const t = getPublicEventCopy(locale);

  return {
    title: t.teamTitle(publicEvent.title).slice(0, 80),
    description:
      `${getTeamDescriptionPlaceholder(locale, publicEvent.title)}\n\n${publicEvent.description}`.slice(
        0,
        3000,
      ),
    itinerary: "",
    coverImageUrl: publicEvent.coverImageUrl ?? "",
    type: "LOCAL",
    category: publicEvent.category,
    visibility: "PUBLIC",
    otherCategoryText: publicEvent.category === "OTHER" ? t.detailSource : "",
    city: publicEvent.city,
    destination: "",
    address: publicEvent.address,
    latitude: publicEvent.latitude?.toString() ?? "",
    longitude: publicEvent.longitude?.toString() ?? "",
    startAt: formatParisDateTimeInput(publicEvent.startAt),
    endAt: formatParisDateTimeInput(publicEvent.endAt),
    capacity: "0",
    capacityLimitEnabled: false,
    minParticipants: "",
    requiresApproval: false,
    priceType: publicEvent.priceType,
    priceText: publicEvent.priceText ?? t.officialPriceFallback,
    ticketUrl: publicEvent.ticketUrl ?? "",
    ticketLabel: publicEvent.ticketLabel ?? "",
    publicEventId: publicEvent.id,
    importSourceUrl: "",
  };
}

export default async function NewPublicEventTeamPage({
  params,
}: NewPublicEventTeamPageProps) {
  const { locale, publicEventId } = await params;
  await requireUser(locale);

  const t = getPublicEventCopy(locale);
  const publicEvent = await getPublicEventById(publicEventId);

  if (!publicEvent) {
    notFound();
  }

  const eventEndBoundary = new Date(publicEvent.endAt ?? publicEvent.startAt);
  const isCancelled = publicEvent.status === "CANCELLED";
  const isEnded = eventEndBoundary <= new Date();
  const canCreateTeam = !isCancelled && !isEnded;
  const unavailableReason = isCancelled ? t.eventCancelled : t.eventEnded;

  return (
    <PageContainer className="max-w-6xl space-y-5 py-4 sm:space-y-6 sm:py-8">
      <Link
        className="inline-flex items-center gap-2 text-sm font-medium text-moss transition hover:text-ink"
        href={withLocale(locale, `/public-events/${publicEvent.id}`)}
      >
        <ArrowLeft className="h-4 w-4" />
        {t.backToEvent}
      </Link>

      <div className="max-w-3xl">
        <p className="text-sm font-semibold text-moss">{t.basedOnEvent}</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-normal text-ink">
          {t.createTeamTitle}
        </h1>
        <p className="mt-2 text-sm leading-6 text-zinc-600">
          {t.createTeamDescription}
        </p>
      </div>

      <section className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <aside className="min-w-0 rounded-[1.25rem] border border-[#d8ccb4] bg-white/80 p-4 shadow-sm lg:sticky lg:top-24 lg:order-2">
          <p className="text-xs font-semibold uppercase text-moss">
            {t.detailSource}
          </p>
          <h2 className="mt-2 text-lg font-semibold leading-snug text-ink">
            {publicEvent.title}
          </h2>
          <div className="mt-4 grid gap-3 text-sm text-zinc-600">
            <span className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-[#80613b]" />
              <span className="min-w-0 break-words">
                {getEventDateLabel(publicEvent, locale)}
              </span>
            </span>
            <span className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#80613b]" />
              <span className="min-w-0 break-words">{publicEvent.address}</span>
            </span>
            <span className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2">
              <Ticket className="mt-0.5 h-4 w-4 shrink-0 text-[#80613b]" />
              <span className="min-w-0 break-words">
                {getEventPriceLabel(publicEvent, locale)}
              </span>
            </span>
          </div>
          <div className="mt-4 rounded-2xl bg-[#fff8ec] px-3 py-3 text-sm leading-6 text-zinc-600 ring-1 ring-[#dccba8]">
            {t.publicEventRuleDescription}
          </div>
        </aside>

        <div className="min-w-0 lg:order-1">
          {!canCreateTeam ? (
            <div className="rounded-[1.25rem] border border-zinc-200 bg-white/80 p-5 text-sm leading-6 text-zinc-600 shadow-sm">
              {unavailableReason}
            </div>
          ) : (
            <NewActivityForm
              initialValues={getInitialValues(publicEvent, locale)}
              locale={locale}
              showLinkImport={false}
            />
          )}
        </div>
      </section>
    </PageContainer>
  );
}
