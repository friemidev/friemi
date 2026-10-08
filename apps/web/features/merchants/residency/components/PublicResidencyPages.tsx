import Link from "next/link";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  MapPin,
  UsersRound,
} from "lucide-react";
import { PageContainer } from "@/components/layout/PageContainer";
import { getLocalizedActivityDetailPath } from "@/features/activities/utils/activityRoutes";
import { withLocale } from "@/lib/routes";
import { getPublicResidencyCopy } from "../publicCopy";
import type { ResidencySlotSummary } from "../queries";
import { getParisDateString } from "../validation";
import { formatResidencyDate, ResidencyCalendar } from "./ResidencyCalendar";
import { PublicResidencySignupForm } from "./PublicResidencySignupForm";

type PublicMerchant = {
  id: string;
  name: string;
  city: string;
  address: string | null;
};

function ResidencyPageFrame({
  backHref,
  backLabel,
  children,
  locale,
  title,
}: {
  backHref: string;
  backLabel: string;
  children: React.ReactNode;
  locale: string;
  title: string;
}) {
  return (
    <PageContainer
      mobileSafeTop
      mobileSafeBottom
      className="max-w-4xl pb-16 pt-4 text-ink sm:pt-8"
    >
      <header className="flex min-h-14 items-center gap-3">
        <Link
          aria-label={backLabel}
          className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-fog text-forest transition active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
          href={withLocale(locale, backHref)}
        >
          <ArrowLeft aria-hidden="true" className="h-5 w-5" />
        </Link>
        <span className="text-base font-bold">{title}</span>
      </header>
      {children}
    </PageContainer>
  );
}

export function PublicResidencyCalendarPage({
  locale,
  merchant,
  month,
  slots,
}: {
  locale: string;
  merchant: PublicMerchant;
  month?: string;
  slots: ResidencySlotSummary[];
}) {
  const copy = getPublicResidencyCopy(locale);
  const basePath = `/merchants/${merchant.id}/bookings`;

  return (
    <ResidencyPageFrame
      backHref={`/merchants/${merchant.id}`}
      backLabel={copy.backToMerchant}
      locale={locale}
      title={copy.calendar}
    >
      <div className="mt-5 rounded-3xl bg-forest px-5 py-7 text-paper sm:px-8 sm:py-9">
        <CalendarDays aria-hidden="true" className="h-7 w-7 text-paper/75" />
        <h1 className="mt-5 break-words text-2xl font-bold leading-tight tracking-tight sm:text-3xl">
          {copy.residencyAt(merchant.name)}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-paper/85 sm:text-base">
          {copy.calendarIntro}
        </p>
      </div>
      <div className="mt-8 sm:mt-10">
        <ResidencyCalendar
          basePath={basePath}
          listTitle={copy.calendarDates}
          locale={locale}
          month={month}
          slots={slots}
        />
      </div>
    </ResidencyPageFrame>
  );
}

export function PublicResidencyDatePage({
  calendarAvailable = true,
  isAuthenticated,
  isMerchantOwner = false,
  locale,
  signInHref,
  slot,
}: {
  calendarAvailable?: boolean;
  isAuthenticated: boolean;
  isMerchantOwner?: boolean;
  locale: string;
  signInHref: string;
  slot: ResidencySlotSummary;
}) {
  const copy = getPublicResidencyCopy(locale);
  const basePath = `/merchants/${slot.merchant.id}/bookings`;
  const isPublished = slot.status === "PUBLISHED";
  const isCancelled = slot.status === "CANCELLED";
  const dateHasPassed = slot.date < getParisDateString();

  return (
    <ResidencyPageFrame
      backHref={
        calendarAvailable
          ? `${basePath}?month=${slot.date.slice(0, 7)}`
          : "/activities"
      }
      backLabel={
        calendarAvailable ? copy.backToCalendar : copy.backToActivities
      }
      locale={locale}
      title={copy.residency}
    >
      <section className="mt-5 rounded-3xl bg-forest px-5 py-7 text-paper sm:px-8 sm:py-10">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-paper/75">
          <span className="rounded-full bg-paper/15 px-3 py-1.5 text-paper">
            {isCancelled
              ? copy.cancelledDate
              : isPublished
                ? copy.published
                : copy.confirmed}
          </span>
          <span>{slot.merchant.name}</span>
        </div>
        <p className="mt-7 text-sm font-semibold text-paper/75">{copy.day}</p>
        <p className="mt-1 text-2xl font-bold leading-tight sm:text-3xl">
          {formatResidencyDate(slot.date, locale)}
        </p>
        <h1 className="mt-7 break-words text-xl font-bold leading-snug sm:text-2xl">
          {slot.title}
        </h1>
        <p className="mt-3 whitespace-pre-line break-words text-sm leading-7 text-paper/85 sm:text-base">
          {slot.description}
        </p>
      </section>

      <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-sm text-ink/70">
        {!isCancelled ? (
          <span className="inline-flex items-center gap-2">
            <UsersRound aria-hidden="true" className="h-4 w-4 text-forest" />
            {isPublished
              ? copy.reservationParticipants(slot.signupCount)
              : copy.participants(slot.signupCount)}
          </span>
        ) : null}
        <span className="inline-flex items-center gap-2">
          <MapPin aria-hidden="true" className="h-4 w-4 text-forest" />
          {[slot.merchant.city, slot.merchant.address]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </div>

      <div className="mt-9 max-w-md">
        {isCancelled ? (
          <p className="rounded-xl bg-fog px-4 py-4 text-sm leading-6 text-ink/75">
            {copy.cancelledDateHint}
          </p>
        ) : isPublished ? (
          slot.activityId ? (
            <Link
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-forest px-5 py-3 text-sm font-bold text-paper transition active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
              href={getLocalizedActivityDetailPath(locale, slot.activityId)}
            >
              {copy.goToActivity}
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          ) : (
            <p className="text-sm text-ink/70">{copy.unavailable}</p>
          )
        ) : isMerchantOwner ? (
          <div className="space-y-3">
            <p className="text-sm leading-6 text-ink/70">
              {copy.ownerBookingHint}
            </p>
            <Link
              className="flex min-h-12 items-center justify-center gap-2 rounded-xl bg-forest px-5 py-3 text-sm font-bold text-paper transition active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
              href={withLocale(locale, `/profile/store/bookings/${slot.id}`)}
            >
              {copy.ownerBookingLink}
              <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
            </Link>
          </div>
        ) : dateHasPassed ? (
          <p className="text-sm text-ink/70">{copy.unavailable}</p>
        ) : isAuthenticated ? (
          <PublicResidencySignupForm
            key={slot.viewerSignedUp ? "signed-up" : "not-signed-up"}
            locale={locale}
            signedUp={slot.viewerSignedUp}
            slotId={slot.id}
          />
        ) : (
          <Link
            className="flex min-h-12 items-center justify-center rounded-xl bg-forest px-5 py-3 text-sm font-bold text-paper transition active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-forest"
            href={signInHref}
          >
            {copy.signIn}
          </Link>
        )}
      </div>
    </ResidencyPageFrame>
  );
}
