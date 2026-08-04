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
import { getOptionalCurrentUserProfileSnapshot } from "@/lib/auth";
import { getSignInHref } from "@/lib/auth-redirect";
import { withLocale } from "@/lib/routes";

type NewPublicEventTeamPageProps = {
  params: Promise<{
    locale: string;
    publicEventId: string;
  }>;
};

export const dynamic = "force-dynamic";

function getCreateTeamHeaderCopy(locale: string) {
  if (locale === "fr") {
    return {
      cancel: "Annuler",
      publish: "Publier",
      title: "Sortie groupée",
    };
  }

  if (locale === "en") {
    return {
      cancel: "Cancel",
      publish: "Publish",
      title: "Event crew",
    };
  }

  return {
    cancel: "取消",
    publish: "发布",
    title: "活动聚聚",
  };
}

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
    hideAddressFromNonParticipants: false,
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

  const t = getPublicEventCopy(locale);
  const [profile, publicEvent] = await Promise.all([
    getOptionalCurrentUserProfileSnapshot(),
    getPublicEventById(publicEventId),
  ]);

  if (!publicEvent) {
    notFound();
  }

  const eventEndBoundary = new Date(publicEvent.endAt ?? publicEvent.startAt);
  const isCancelled = publicEvent.status === "CANCELLED";
  const isEnded = eventEndBoundary <= new Date();
  const canCreateTeam = !isCancelled && !isEnded;
  const unavailableReason = isCancelled ? t.eventCancelled : t.eventEnded;
  const headerCopy = getCreateTeamHeaderCopy(locale);
  const formId = `public-event-team-form-${publicEvent.id}`;

  return (
    <PageContainer className="max-w-6xl overflow-x-clip space-y-5 py-0 sm:space-y-6 sm:py-8">
      <div className="grid h-16 grid-cols-[4.5rem_minmax(0,1fr)_4.5rem] items-center border-b border-[#E7E1C9] sm:hidden">
        <Link
          className="text-sm font-semibold text-ink/80 transition hover:text-moss"
          href={withLocale(locale, `/public-events/${publicEvent.id}`)}
        >
          {headerCopy.cancel}
        </Link>
        <h1 className="truncate text-center text-lg font-black tracking-normal text-ink">
          {headerCopy.title}
        </h1>
        <button
          className="justify-self-end rounded-full bg-[#007A4D] px-4 py-2 text-sm font-black text-white transition hover:bg-[#156240] disabled:bg-zinc-300"
          disabled={!canCreateTeam}
          form={canCreateTeam ? formId : undefined}
          type="submit"
        >
          {headerCopy.publish}
        </button>
      </div>

      <div className="hidden grid-cols-[minmax(0,8rem)_minmax(0,1fr)_auto] items-center gap-3 sm:grid md:grid-cols-[minmax(0,11rem)_minmax(0,1fr)_minmax(0,11rem)] md:gap-4">
        <Link
          className="inline-flex min-w-0 items-center gap-2 text-sm font-medium text-moss transition hover:text-ink"
          href={withLocale(locale, `/public-events/${publicEvent.id}`)}
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          <span className="truncate">{t.backToEvent}</span>
        </Link>
        <h1 className="truncate text-center text-2xl font-black tracking-normal text-ink">
          {headerCopy.title}
        </h1>
        <button
          className="justify-self-end rounded-full bg-[#007A4D] px-5 py-2.5 text-sm font-black text-white transition hover:bg-[#156240] disabled:bg-zinc-300"
          disabled={!canCreateTeam}
          form={canCreateTeam ? formId : undefined}
          type="submit"
        >
          {headerCopy.publish}
        </button>
      </div>

      <section className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_20rem] xl:items-start">
        <aside className="min-w-0 rounded-[1.25rem] border border-[#D6D5B2] bg-white/80 p-4 shadow-sm xl:sticky xl:top-24 xl:order-2">
          <p className="text-xs font-semibold uppercase text-moss">
            {t.detailSource}
          </p>
          <h2 className="mt-2 text-lg font-semibold leading-snug text-ink">
            {publicEvent.title}
          </h2>
          <div className="mt-4 grid gap-3 text-sm text-zinc-600">
            <span className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-[#156240]" />
              <span className="min-w-0 break-words">
                {getEventDateLabel(publicEvent, locale)}
              </span>
            </span>
            <span className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#156240]" />
              <span className="min-w-0 break-words">{publicEvent.address}</span>
            </span>
            <span className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2">
              <Ticket className="mt-0.5 h-4 w-4 shrink-0 text-[#156240]" />
              <span className="min-w-0 break-words">
                {getEventPriceLabel(publicEvent, locale)}
              </span>
            </span>
          </div>
        </aside>

        <div className="min-w-0 xl:order-1">
          {!canCreateTeam ? (
            <div className="rounded-[1.25rem] border border-zinc-200 bg-white/80 p-5 text-sm leading-6 text-zinc-600 shadow-sm">
              {unavailableReason}
            </div>
          ) : (
            <NewActivityForm
              formId={formId}
              initialValues={getInitialValues(publicEvent, locale)}
              isAuthenticated={Boolean(profile)}
              locale={locale}
              showFormActions={false}
              signInHref={getSignInHref(
                locale,
                `/public-events/${publicEvent.id}/teams/new`,
              )}
            />
          )}
        </div>
      </section>
    </PageContainer>
  );
}
