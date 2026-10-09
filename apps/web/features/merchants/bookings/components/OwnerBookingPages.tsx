import Link from "next/link";
import {
  ArrowUpRight,
  CalendarDays,
  ChevronRight,
  Settings2,
} from "lucide-react";
import { getLocalizedActivityDetailPath } from "@/features/activities/utils/activityRoutes";
import { withLocale } from "@/lib/routes";
import { getBookingCopy } from "../copy";
import type {
  BookingMerchant,
  BookingRecord,
  BookingSettingsView,
} from "../types";
import { getBookingToday } from "../validation";
import { BookingHeader, BookingShell, primaryClass } from "./BookingPrimitives";
import { BookingList } from "./BookingList";
import { BookingSettingsForm } from "./BookingSettingsForm";

export function OwnerBookingDashboard({
  locale,
  merchant,
  settings,
  bookings,
  hasLegacy = false,
}: {
  locale: string;
  merchant: BookingMerchant;
  settings: BookingSettingsView | null;
  bookings: BookingRecord[];
  hasLegacy?: boolean;
}) {
  const copy = getBookingCopy(locale);
  return (
    <BookingShell>
      <BookingHeader
        backHref="/profile/store"
        backLabel={copy.backStore}
        locale={locale}
        title={copy.management}
      />
      <section className="pt-7">
        <h2 className="text-xl font-bold tracking-tight text-forest">
          {merchant.name}
        </h2>
        {settings ? (
          <>
            <div className="mt-3 flex items-center gap-2 text-sm text-ink/70">
              <span
                aria-hidden="true"
                className={`h-2 w-2 rounded-full ${settings.enabled && merchant.bookingAccessEnabled ? "bg-meadow" : "bg-ink/40"}`}
              />
              {settings.enabled && merchant.bookingAccessEnabled
                ? copy.open
                : copy.paused}
            </div>
            <nav
              className="mt-5 grid gap-1 sm:grid-cols-2"
              aria-label={copy.management}
            >
              {merchant.bookingAccessEnabled ? (
                <Link
                  className="flex min-h-14 items-center gap-3 rounded-xl bg-fog px-4 text-sm font-semibold text-forest focus-visible:outline-2 focus-visible:outline-forest"
                  href={withLocale(locale, "/profile/store/bookings/settings")}
                >
                  <Settings2 aria-hidden="true" className="h-5 w-5" />
                  <span className="flex-1">{copy.settings}</span>
                  <ChevronRight aria-hidden="true" className="h-4 w-4" />
                </Link>
              ) : null}
              <Link
                className="flex min-h-14 items-center gap-3 rounded-xl px-4 text-sm font-semibold text-forest focus-visible:outline-2 focus-visible:outline-forest"
                href={getLocalizedActivityDetailPath(
                  locale,
                  settings.activityId,
                )}
              >
                <CalendarDays aria-hidden="true" className="h-5 w-5" />
                <span className="flex-1">{copy.viewSpace}</span>
                <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            </nav>
            {!merchant.bookingAccessEnabled ? (
              <p className="mt-4 text-sm leading-6 text-ink/70">
                {copy.accessPaused}
              </p>
            ) : null}
          </>
        ) : (
          <div className="pt-7">
            <h3 className="text-lg font-bold">
              {merchant.bookingAccessEnabled ? copy.setupTitle : copy.noAccess}
            </h3>
            <p className="mt-3 max-w-lg text-sm leading-7 text-ink/70">
              {merchant.bookingAccessEnabled
                ? copy.setupHint
                : copy.noAccessHint}
            </p>
            {merchant.bookingAccessEnabled ? (
              <Link
                className={`${primaryClass} mt-6`}
                href={withLocale(locale, "/profile/store/bookings/settings")}
              >
                {copy.createSpace}
                <ArrowUpRight aria-hidden="true" className="h-4 w-4" />
              </Link>
            ) : null}
          </div>
        )}
      </section>
      {settings ? (
        <section className="pt-8">
          <BookingList
            bookings={bookings}
            locale={locale}
            owner
            today={getBookingToday()}
          />
        </section>
      ) : null}
      {hasLegacy ? (
        <Link
          className="mt-8 flex min-h-12 items-center justify-between gap-3 text-sm font-semibold text-ink/70 focus-visible:outline-2 focus-visible:outline-forest"
          href={withLocale(locale, "/profile/store/bookings/history")}
        >
          {copy.legacy}
          <ChevronRight aria-hidden="true" className="h-4 w-4" />
        </Link>
      ) : null}
    </BookingShell>
  );
}

export function OwnerBookingSettings({
  locale,
  merchant,
  settings,
}: {
  locale: string;
  merchant: BookingMerchant;
  settings: BookingSettingsView | null;
}) {
  const copy = getBookingCopy(locale);
  return (
    <BookingShell>
      <BookingHeader
        backHref="/profile/store/bookings"
        backLabel={copy.backBookings}
        locale={locale}
        title={settings ? copy.settings : copy.createSpace}
      />
      {merchant.bookingAccessEnabled ? (
        <BookingSettingsForm
          locale={locale}
          merchant={merchant}
          settings={settings}
        />
      ) : (
        <section className="pt-12">
          <h2 className="text-xl font-bold">{copy.noAccess}</h2>
          <p className="mt-3 text-sm leading-7 text-ink/70">
            {copy.noAccessHint}
          </p>
        </section>
      )}
    </BookingShell>
  );
}
