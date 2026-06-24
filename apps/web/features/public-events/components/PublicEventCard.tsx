import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  MapPin,
  Ticket,
  UsersRound,
} from "lucide-react";
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@chill-club/ui";
import {
  formatActivityDate,
  formatActivityDateOnly,
  formatActivityTime,
} from "@chill-club/shared";
import { getCategoryLabel, getPriceTypeLabel } from "@/lib/copy";
import { withLocale } from "@/lib/routes";
import type { PublicEventCardViewModel } from "../types";
import { getPublicEventCopy } from "../copy";
import { ActivityCoverImage } from "@/features/activities/components/ActivityCoverImage";
import type { AnalyticsSourceSurface } from "@/features/analytics/events";
import { PublicEventFavoriteButton } from "@/features/favorites/components/PublicEventFavoriteButton";
import { getPublicEventLocationDisplay } from "../utils/locationDisplay";

type PublicEventCardProps = {
  event: PublicEventCardViewModel;
  isAuthenticated?: boolean;
  locale: string;
  redirectPath?: string;
  showFavoriteButton?: boolean;
  sourceSurface?: AnalyticsSourceSurface;
};

function getEventDateLabel(event: PublicEventCardViewModel, locale: string) {
  if (!event.endAt) {
    return formatActivityDate(event.startAt, locale);
  }

  if (
    formatActivityDateOnly(event.startAt, locale) ===
    formatActivityDateOnly(event.endAt, locale)
  ) {
    return `${formatActivityDate(event.startAt, locale)}-${formatActivityTime(
      event.endAt,
      locale,
    )}`;
  }

  return `${formatActivityDate(event.startAt, locale)} - ${formatActivityDate(
    event.endAt,
    locale,
  )}`;
}

function getEventPriceLabel(event: PublicEventCardViewModel, locale: string) {
  const priceTypeLabel = getPriceTypeLabel(event.priceType, locale);
  const priceText = event.priceText?.trim() ?? "";

  if (priceText.length === 0) {
    return priceTypeLabel;
  }

  if (event.priceType === "FREE" && priceText === "0") {
    return priceTypeLabel;
  }

  return priceText;
}

export function PublicEventCard({
  event,
  isAuthenticated = false,
  locale,
  redirectPath = "/activities",
  showFavoriteButton = false,
  sourceSurface = "activity_list",
}: PublicEventCardProps) {
  const t = getPublicEventCopy(locale);
  const eventHref = withLocale(locale, `/public-events/${event.id}`);
  const eventActionHref =
    event.teamCount > 0 ? `${eventHref}#public-event-teams` : eventHref;
  const eventLocation = getPublicEventLocationDisplay(event, locale);

  return (
    <Card className="group relative flex h-full flex-col overflow-hidden border-[#ded2bc] bg-white/90 shadow-sm transition hover:-translate-y-0.5 hover:border-[#cdb88f] hover:shadow-lg">
      {showFavoriteButton ? (
        <div className="absolute right-3 top-4 z-20 sm:top-5">
          <PublicEventFavoriteButton
            favoriteCount={event.favoriteCount}
            publicEventId={event.id}
            className="size-9 min-h-9 min-w-9"
            isAuthenticated={isAuthenticated}
            isFavorited={Boolean(event.isFavorited)}
            locale={locale}
            redirectPath={redirectPath}
            sourceSurface={sourceSurface}
          />
        </div>
      ) : null}
      <Link
        className="flex flex-1 flex-col"
        href={eventHref}
      >
        <div className="relative flex h-40 items-end justify-between gap-2 overflow-hidden bg-[#d9e9ee] p-3 sm:h-44 sm:p-4">
          <ActivityCoverImage
            src={event.coverImageUrl}
            overlayClassName="bg-gradient-to-t from-black/48 via-black/12 to-black/5"
          />
          <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-black/8 to-transparent" />
          <div className="relative mt-auto flex min-w-0 flex-wrap items-center gap-1.5">
            <span className="rounded-md bg-[rgba(22,18,14,0.76)] px-2.5 py-1 text-[11px] font-semibold leading-none text-[#fffaf2] shadow-[0_8px_18px_rgba(0,0,0,0.24)] ring-1 ring-white/10">
              {getCategoryLabel(event.category, locale)}
            </span>
            <span className="rounded-md bg-[rgba(255,250,242,0.94)] px-2.5 py-1 text-[11px] font-medium leading-none text-zinc-900 shadow-[0_8px_18px_rgba(0,0,0,0.18)]">
              {t.detailSource}
            </span>
          </div>
        </div>
        <CardHeader className="p-4 pb-2 sm:p-5 sm:pb-2">
          <CardTitle className="line-clamp-2 text-base leading-snug sm:text-lg">
            {event.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col gap-3 p-4 pt-0 sm:p-5 sm:pt-0">
          <p className="line-clamp-2 text-sm leading-6 text-zinc-600">
            {event.description}
          </p>
          <div className="grid gap-2.5 text-sm text-zinc-600">
            <span className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2">
              <CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-[#80613b]" />
              <span className="min-w-0">
                {getEventDateLabel(event, locale)}
              </span>
            </span>
            <span className="grid grid-cols-[auto_minmax(0,1fr)] items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#80613b]" />
              <span className="min-w-0 line-clamp-1">
                {eventLocation.displayLabel}
              </span>
            </span>
          </div>
          <div className="mt-auto flex flex-wrap items-center justify-between gap-2 border-t border-black/5 pt-3 text-sm text-zinc-600">
            <span className="inline-flex min-w-0 items-center gap-1.5 font-medium text-ink">
              <Ticket className="h-3.5 w-3.5 shrink-0 text-[#80613b]" />
              <span className="min-w-0 truncate">
                {getEventPriceLabel(event, locale)}
              </span>
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-moss/10 px-2.5 py-1 text-xs font-semibold text-moss">
              <UsersRound className="h-3.5 w-3.5" />
              {t.teamCount(event.teamCount)}
            </span>
          </div>
        </CardContent>
      </Link>
      <div className="px-4 pb-4 sm:px-5 sm:pb-5">
        <Link href={eventActionHref}>
          <Button className="h-10 w-full whitespace-nowrap rounded-full border-0 bg-[#d88d72] text-white transition group-hover:bg-[#c87b61]">
            {event.teamCount > 0 ? t.viewTeams : t.viewEvent}
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </Card>
  );
}

export { getEventDateLabel, getEventPriceLabel };
