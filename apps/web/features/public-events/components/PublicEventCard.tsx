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
import { PublicEventFavoriteButton } from "@/features/favorites/components/PublicEventFavoriteButton";

type PublicEventCardProps = {
  event: PublicEventCardViewModel;
  isAuthenticated?: boolean;
  locale: string;
  redirectPath?: string;
  showFavoriteButton?: boolean;
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
  return event.priceText || getPriceTypeLabel(event.priceType, locale);
}

export function PublicEventCard({
  event,
  isAuthenticated = false,
  locale,
  redirectPath = "/activities",
  showFavoriteButton = false,
}: PublicEventCardProps) {
  const t = getPublicEventCopy(locale);
  const eventHref = withLocale(locale, `/public-events/${event.id}`);
  const eventActionHref =
    event.teamCount > 0 ? `${eventHref}#public-event-teams` : eventHref;

  return (
    <Card className="group relative flex h-full flex-col overflow-hidden border-[#ded2bc] bg-white/90 shadow-sm transition hover:-translate-y-0.5 hover:border-[#cdb88f] hover:shadow-lg">
      {showFavoriteButton ? (
        <div className="absolute right-3 top-3 z-20">
          <PublicEventFavoriteButton
            favoriteCount={event.favoriteCount}
            publicEventId={event.id}
            className="h-9 w-9"
            isAuthenticated={isAuthenticated}
            isFavorited={Boolean(event.isFavorited)}
            locale={locale}
            redirectPath={redirectPath}
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
            overlayClassName="bg-gradient-to-t from-black/42 via-black/10 to-black/8"
          />
          <div className="relative flex min-w-0 flex-wrap items-center gap-2">
            <span className="rounded-full bg-white/90 px-2.5 py-1 text-xs font-semibold leading-none text-ink shadow-sm">
              {getCategoryLabel(event.category, locale)}
            </span>
            <span className="rounded-full bg-white/80 px-2.5 py-1 text-xs font-medium leading-none text-zinc-700 shadow-sm">
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
              <span className="min-w-0 line-clamp-1">{event.address}</span>
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
